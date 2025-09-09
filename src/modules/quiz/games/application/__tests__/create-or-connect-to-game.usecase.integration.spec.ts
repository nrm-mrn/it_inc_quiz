import { TestingModule, Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configModule } from 'src/config-dynamic-module';
import { CoreConfig } from 'src/core/core.config';
import { CoreModule } from 'src/core/core.module';
import { TestingApiModule } from 'src/modules/testing/testingAPI.module';
import { TestingAPIService } from 'src/modules/testing/testingAPI.service';
import {
  ConnectCommandHandler,
  ConnectCommand,
} from '../usecases/connect-or-create-game.usecase';
import { GameRepository } from '../../infrastructure/game.repository';
import { QuestionsRepository } from 'src/modules/quiz/questions/infrastructure/questions.repository';
import { Game, GameStatus } from '../../domain/game.schema';
import { Player } from '../../domain/player.schema';
import { PlayerAnswer } from '../../domain/answer.schema';
import { GameQuestion } from '../../domain/gameQuestions.schema';
import { Question } from 'src/modules/quiz/questions/domain/question.schema';
import { User } from 'src/modules/user-accounts/domain/user.schema';
import { UsersRepository } from 'src/modules/user-accounts/infrastructure/users.repository';
import { EmailConfirmation } from 'src/modules/user-accounts/domain/emailConfirmation.schema';
import { PasswordRecovery } from 'src/modules/user-accounts/domain/passwordRecovery.schema';
import { Duration } from 'luxon';
import { DeviceAuthSession } from 'src/modules/user-accounts/domain/session.schema';
import { UUID } from 'crypto';

describe('Connect or Create Game Command Handler Integration Test', () => {
  let app: TestingModule;
  let commandHandler: ConnectCommandHandler;
  let gameRepository: GameRepository;
  let questionsRepository: QuestionsRepository;
  let usersRepository: UsersRepository;
  let testingApiService: TestingAPIService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        configModule,
        TypeOrmModule.forRootAsync({
          imports: [CoreModule],
          useFactory: (coreConfig: CoreConfig) => ({
            type: 'postgres',
            host: coreConfig.dbHost,
            port: coreConfig.dbPort,
            username: coreConfig.dbUser,
            password: coreConfig.dbPass,
            database: coreConfig.dbName,
            autoLoadEntities: true,
            synchronize: false,
            logging: true,
          }),
          inject: [CoreConfig],
        }),
        TestingApiModule,
        TypeOrmModule.forFeature([
          Game,
          Player,
          PlayerAnswer,
          GameQuestion,
          Question,
          User,
          EmailConfirmation,
          PasswordRecovery,
          DeviceAuthSession,
        ]),
      ],
      providers: [
        ConnectCommandHandler,
        GameRepository,
        QuestionsRepository,
        UsersRepository,
        TestingAPIService,
      ],
    }).compile();

    commandHandler = app.get<ConnectCommandHandler>(ConnectCommandHandler);
    gameRepository = app.get<GameRepository>(GameRepository);
    questionsRepository = app.get<QuestionsRepository>(QuestionsRepository);
    usersRepository = app.get<UsersRepository>(UsersRepository);
    testingApiService = app.get<TestingAPIService>(TestingAPIService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await testingApiService.clearDb();
  });

  // Helper function to create a test user
  async function createTestUser(login: string, email: string): Promise<User> {
    const user = User.createUser({
      login,
      email,
      passwordHash: 'hashedPassword123',
      confirmationDuration: Duration.fromObject({ minutes: 30 }),
    });
    return await usersRepository.saveUser(user);
  }

  // Helper function to create published questions
  async function createPublishedQuestions(
    count: number = 5,
  ): Promise<Question[]> {
    const questions: Question[] = [];
    for (let i = 0; i < count; i++) {
      const question = Question.create({
        body: `Test question ${i + 1}?`,
        answers: [`Answer ${i + 1}`, `Alternative ${i + 1}`],
      });
      question.setPublish(true);
      const saved = await questionsRepository.saveQuestion(question);
      const fullQuestion = await questionsRepository.getQuestionById(saved.id);
      questions.push(fullQuestion!);
    }
    return questions;
  }

  describe('execute', () => {
    it('should create a new pending game when no pending games exist', async () => {
      const user = await createTestUser('testuser1', 'test1@example.com');
      await createPublishedQuestions(5);
      const command = new ConnectCommand(user.id);
      const gameId = await commandHandler.execute(command);

      expect(gameId).toBeDefined();
      expect(typeof gameId).toBe('string');

      const createdGame = await gameRepository
        .getActiveGameForUserOrFail(user.id)
        .catch(() => null);
      expect(createdGame).toBeNull(); // Should be null because game is pending, not active

      // Verify pending game exists
      const pendingGame = await gameRepository.matchGame();
      expect(pendingGame).toBeDefined();
      expect(pendingGame!.id).toBe(gameId);
      expect(pendingGame!.status).toBe(GameStatus.Pending);
      expect(pendingGame!.player1Id).toBeDefined();
      expect(pendingGame!.player2Id).toBeNull();
    });

    it('should connect second player to existing pending game and start the game', async () => {
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');
      await createPublishedQuestions(5);

      const command1 = new ConnectCommand(user1.id);
      const gameId1 = await commandHandler.execute(command1);

      const command2 = new ConnectCommand(user2.id);
      const gameId2 = await commandHandler.execute(command2);

      expect(gameId1).toBe(gameId2); // Should be the same game

      const pendingGame = await gameRepository.matchGame();
      expect(pendingGame).toBeNull();

      // Verify game is now active with both players
      const activeGame = await gameRepository.getActiveGameById(gameId1);
      expect(activeGame).toBeDefined();
      expect(activeGame.status).toBe(GameStatus.Active);
      expect(activeGame.player1Id).toBeDefined();
      expect(activeGame.player2Id).toBeDefined();
      expect(activeGame.questions).toBeDefined();
      expect(activeGame.questions.length).toBe(5);

      // Verify both players can access the same game
      const activeGame2 = await gameRepository.getActiveGameForUserOrFail(
        user2.id,
      );
      expect(activeGame2.id).toBe(activeGame.id);
    });

    it('should handle multiple simultaneous create requests from different users', async () => {
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');
      // const user3 = await createTestUser('testuser3', 'test3@example.com');
      await createPublishedQuestions(5);

      const command1 = new ConnectCommand(user1.id);
      const command2 = new ConnectCommand(user2.id);
      // const command3 = new ConnectCommand(user3.id);

      const res = await Promise.all([
        commandHandler.execute(command1),
        commandHandler.execute(command2),
      ]);

      const gameId1 = res[0];
      const gameId2 = res[1];
      // const gameId3 = await commandHandler.execute(command3);

      expect(gameId1).toBe(gameId2); // First two users should be in same game
      // expect(gameId3).not.toBe(gameId1); // Third user should create new game

      // Verify game is active
      const activeGame1 = await gameRepository.getActiveGameForUserOrFail(
        user1.id,
      );
      expect(activeGame1.status).toBe(GameStatus.Active);

      // Verify no pending games exist
      const pendingGame = await gameRepository.matchGame();
      expect(pendingGame).toBeNull();
    });

    it('should throw error when insufficient questions available', async () => {
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');
      await createPublishedQuestions(3); // Only 3 questions, need 5

      // Create first game (pending)
      const command1 = new ConnectCommand(user1.id);
      await commandHandler.execute(command1);

      const command2 = new ConnectCommand(user2.id);
      await expect(commandHandler.execute(command2)).rejects.toThrow();
    });

    it('should create players with correct initial state', async () => {
      const user = await createTestUser('testuser1', 'test1@example.com');
      await createPublishedQuestions(5);
      const command = new ConnectCommand(user.id);

      await commandHandler.execute(command);

      const pendingGame = await gameRepository.matchGame();
      const player = await gameRepository.getPlayerByIdOrFail(
        pendingGame!.player1Id,
      );

      expect(player.userId).toBe(user.id);
      expect(player.score).toBe(0);
      expect(player.answers).toEqual([]);
    });

    it('should handle multiple sequential game creations correctly', async () => {
      const users: User[] = [];
      for (let i = 0; i < 6; i++) {
        const user = await createTestUser(`user${i}`, `user${i}@example.com`);
        users.push(user);
      }
      await createPublishedQuestions(5);

      const gameIds: UUID[] = [];
      for (const user of users) {
        const command = new ConnectCommand(user.id);
        const gameId = await commandHandler.execute(command);
        gameIds.push(gameId);
      }

      // Should have 3 different games (pairs: 0-1, 2-3, 4-5)
      expect(gameIds[0]).toBe(gameIds[1]); // First pair
      expect(gameIds[2]).toBe(gameIds[3]); // Second pair
      expect(gameIds[4]).toBe(gameIds[5]); // Third pair

      expect(gameIds[0]).not.toBe(gameIds[2]);
      expect(gameIds[0]).not.toBe(gameIds[4]);
      expect(gameIds[2]).not.toBe(gameIds[4]);

      // Verify no pending games remain
      const pendingGame = await gameRepository.matchGame();
      expect(pendingGame).toBeNull();

      // Verify all games are active
      for (let i = 0; i < 6; i++) {
        const activeGame = await gameRepository.getActiveGameForUserOrFail(
          users[i].id,
        );
        expect(activeGame.status).toBe(GameStatus.Active);
      }
    });

    it('should assign questions correctly when game starts', async () => {
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');
      const questions = await createPublishedQuestions(10); // More than needed

      const command1 = new ConnectCommand(user1.id);
      await commandHandler.execute(command1);

      const command2 = new ConnectCommand(user2.id);
      const gameId = await commandHandler.execute(command2);

      const activeGame = await gameRepository.getActiveGameById(gameId);
      expect(activeGame.questions).toBeDefined();
      expect(activeGame.questions.length).toBe(5);

      // Verify all questions are from our created questions
      const gameQuestionIds = activeGame.questions.map((gq) => gq.questionId);
      const availableQuestionIds = questions.map((q) => q.id);

      gameQuestionIds.forEach((id) => {
        expect(availableQuestionIds).toContain(id);
      });

      // Verify questions are ordered correctly
      activeGame.questions.forEach((gq, index) => {
        expect(gq.order).toBe(index);
        expect(gq.gameId).toBe(gameId);
      });
    });
  });
});
