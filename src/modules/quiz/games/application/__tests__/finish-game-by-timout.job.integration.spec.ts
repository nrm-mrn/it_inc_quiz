import { TestingModule, Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configModule } from 'src/config-dynamic-module';
import { CoreConfig } from 'src/core/core.config';
import { CoreModule } from 'src/core/core.module';
import { TestingApiModule } from 'src/modules/testing/testingAPI.module';
import { TestingAPIService } from 'src/modules/testing/testingAPI.service';
import {
  AnswerQuestionCommandHandler,
  AnswerQuestionCommand,
} from '../usecases/answer-question.usecase';
import {
  ConnectCommandHandler,
  ConnectCommand,
} from '../usecases/connect-or-create-game.usecase';
import { GameRepository } from '../../infrastructure/game.repository';
import { QuestionsRepository } from 'src/modules/quiz/questions/infrastructure/questions.repository';
import { Game, GameStatus } from '../../domain/game.schema';
import { Player, PlayerGameStatus } from '../../domain/player.schema';
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
import { FinishGameProcessor } from '../processors/finish-game-by-timeout.processor';
import { GamesConfig } from '../../config/games.config';
import { BullModule } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';

describe('Finish game by timout consumer Integration Test', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let answerCommandHandler: AnswerQuestionCommandHandler;
  let connectCommandHandler: ConnectCommandHandler;
  let gameRepository: GameRepository;
  let questionsRepository: QuestionsRepository;
  let usersRepository: UsersRepository;
  let testingApiService: TestingAPIService;
  let config: GamesConfig;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
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
            logging: false,
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
        BullModule.forRootAsync({
          imports: [CoreModule],
          useFactory: (coreConfig: CoreConfig) => ({
            connection: {
              host: coreConfig.redisHost,
              port: coreConfig.redisPort,
            },
          }),
          inject: [CoreConfig],
        }),
        BullModule.registerQueue({
          name: 'GamesToFinish',
        }),
      ],
      providers: [
        AnswerQuestionCommandHandler,
        ConnectCommandHandler,
        GameRepository,
        QuestionsRepository,
        UsersRepository,
        TestingAPIService,
        FinishGameProcessor,
        GamesConfig,
      ],
    }).compile();

    answerCommandHandler = moduleRef.get<AnswerQuestionCommandHandler>(
      AnswerQuestionCommandHandler,
    );
    connectCommandHandler = moduleRef.get<ConnectCommandHandler>(
      ConnectCommandHandler,
    );
    gameRepository = moduleRef.get<GameRepository>(GameRepository);
    questionsRepository =
      moduleRef.get<QuestionsRepository>(QuestionsRepository);
    usersRepository = moduleRef.get<UsersRepository>(UsersRepository);
    testingApiService = moduleRef.get<TestingAPIService>(TestingAPIService);
    config = moduleRef.get<GamesConfig>(GamesConfig);
    app = moduleRef.createNestApplication();
    app = await app.init();
  });

  afterAll(async () => {
    await moduleRef.close();
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

  // Helper function to create published questions with known answers
  async function createPublishedQuestions(): Promise<Question[]> {
    const questionsData = [
      { body: 'What is 2+2?', answers: ['4', 'four'] },
      { body: 'What is the capital of France?', answers: ['4', 'Paris'] },
      { body: 'What color is the sky?', answers: ['Blue', '4'] },
      { body: 'How many legs does a spider have?', answers: ['4', 'eight'] },
      { body: 'What is the largest planet?', answers: ['Jupiter', '4'] },
    ];

    const questions: Question[] = [];
    for (const questionData of questionsData) {
      const question = Question.create({
        body: questionData.body,
        answers: questionData.answers,
      });
      question.setPublish(true);
      const saved = await questionsRepository.saveQuestion(question);
      const fullQuestion = await questionsRepository.getQuestionById(saved.id);
      questions.push(fullQuestion!);
    }
    return questions;
  }

  // Helper function to create a pending game with one player
  async function createPendingGame(user1: User): Promise<{
    gameId: UUID;
  }> {
    await createPublishedQuestions();

    const gameId = await connectCommandHandler.execute(
      new ConnectCommand(user1.id),
    );

    return { gameId };
  }

  // Helper function to create an active game with two players
  async function createActiveGame(
    user1: User,
    user2: User,
  ): Promise<{
    gameId: UUID;
  }> {
    await createPublishedQuestions();

    // Connect both players to create active game
    const gameId = await connectCommandHandler.execute(
      new ConnectCommand(user1.id),
    );
    await connectCommandHandler.execute(new ConnectCommand(user2.id));

    return { gameId };
  }

  // Helper function to create a finished game with specific scores
  async function createFinishedGameWithScores(
    user1: User,
    user2: User,
    user1CorrectAnswers: number = 5,
    user2CorrectAnswers: number = 0,
  ): Promise<{
    gameId: UUID;
  }> {
    const { gameId } = await createActiveGame(user1, user2);

    // Answer questions for both players to finish the game
    const game = await gameRepository.getActiveGameById(gameId);
    const questions = game.questions;

    // Player 1 answers
    for (let i = 0; i < questions.length; i++) {
      const answer = i < user1CorrectAnswers ? '4' : 'wrong answer';
      await answerCommandHandler.execute(
        new AnswerQuestionCommand(user1.id, answer),
      );
    }

    // Player 2 answers
    for (let i = 0; i < questions.length; i++) {
      const answer = i < user2CorrectAnswers ? '4' : 'wrong answer';
      await answerCommandHandler.execute(
        new AnswerQuestionCommand(user2.id, answer),
      );
    }

    return { gameId };
  }

  describe('execute', () => {
    it('should finish game by timeout', async () => {
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');

      const { gameId } = await createActiveGame(user1, user2);
      const game = await gameRepository.getActiveGameById(gameId);
      const questions = game.questions;

      for (const question of questions) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, '4'), // Correct answer
        );
      }

      await new Promise((res) => setTimeout(res, config.timeout * 1000 + 200));

      const result = await gameRepository.getGameById(gameId);

      expect(result?.status).toEqual(GameStatus.Finished);
    });

    it('should award bonus point to player who finished first with correct answers', async () => {
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');

      const { gameId } = await createActiveGame(user1, user2);

      // Player 1 answers all questions correctly (finishes first)
      for (let i = 0; i < 5; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, '4'), // Correct answer
        );
      }

      // Player 2 answers only 2 questions correctly
      for (let i = 0; i < 2; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, '4'), // Correct answer
        );
      }

      // Wait for timeout to trigger
      await new Promise((res) => setTimeout(res, config.timeout * 1000 + 200));

      const result = await gameRepository.getGameById(gameId);

      expect(result?.status).toEqual(GameStatus.Finished);
      expect(result?.player1.score).toBe(6); // 5 correct + 1 bonus
      expect(result?.player2.score).toBe(2); // 2 correct, no bonus
      expect(result?.player1.status).toBe(PlayerGameStatus.WINNER);
      expect(result?.player2.status).toBe(PlayerGameStatus.LOSER);
    });

    it('should not award bonus point to player who finished first with no correct answers', async () => {
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');

      const { gameId } = await createActiveGame(user1, user2);

      // Player 1 answers all questions incorrectly (finishes first)
      for (let i = 0; i < 5; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, 'wrong'), // Incorrect answer
        );
      }

      // Player 2 answers 3 questions correctly
      for (let i = 0; i < 3; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, '4'), // Correct answer
        );
      }

      // Wait for timeout to trigger
      await new Promise((res) => setTimeout(res, config.timeout * 1000 + 200));

      const result = await gameRepository.getGameById(gameId);

      expect(result?.status).toEqual(GameStatus.Finished);
      expect(result?.player1.score).toBe(0); // 0 correct, no bonus (no correct answers)
      expect(result?.player2.score).toBe(3); // 3 correct, no bonus (didn't finish first)
      expect(result?.player1.status).toBe(PlayerGameStatus.LOSER);
      expect(result?.player2.status).toBe(PlayerGameStatus.WINNER);
    });

    it('should award bonus to player2 when player2 finishes first with correct answers', async () => {
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');

      const { gameId } = await createActiveGame(user1, user2);

      // Player 1 answers 3 questions correctly
      for (let i = 0; i < 3; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, '4'), // Correct answer
        );
      }

      // Player 2 answers all questions correctly (finishes first)
      for (let i = 0; i < 5; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, '4'), // Correct answer
        );
      }

      // Wait for timeout to trigger
      await new Promise((res) => setTimeout(res, config.timeout * 1000 + 200));

      const result = await gameRepository.getGameById(gameId);

      expect(result?.status).toEqual(GameStatus.Finished);
      expect(result?.player1.score).toBe(3); // 3 correct, no bonus
      expect(result?.player2.score).toBe(6); // 5 correct + 1 bonus
      expect(result?.player1.status).toBe(PlayerGameStatus.LOSER);
      expect(result?.player2.status).toBe(PlayerGameStatus.WINNER);
    });

    it('should result in draw when both players have equal scores after timeout', async () => {
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');

      const { gameId } = await createActiveGame(user1, user2);

      // Player 1 answers all questions correctly (finishes first)
      for (let i = 0; i < 5; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, '4'), // Correct answer
        );
      }

      // Player 2 answers 4 questions correctly (so with bonus they tie)
      for (let i = 0; i < 4; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, '4'), // Correct answer
        );
      }

      // Wait for timeout to trigger
      await new Promise((res) => setTimeout(res, config.timeout * 1000 + 200));

      const result = await gameRepository.getGameById(gameId);

      expect(result?.status).toEqual(GameStatus.Finished);
      expect(result?.player1.score).toBe(6); // 5 correct + 1 bonus
      expect(result?.player2.score).toBe(4); // 4 correct, no bonus
      expect(result?.player1.status).toBe(PlayerGameStatus.WINNER);
      expect(result?.player2.status).toBe(PlayerGameStatus.LOSER);
    });

    it('should handle timeout when both players have same number of answers', async () => {
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');

      const { gameId } = await createActiveGame(user1, user2);

      // Both players answer 3 questions correctly
      for (let i = 0; i < 3; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, '4'), // Correct answer
        );
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, '4'), // Correct answer
        );
      }

      // Player 1 finishes first
      for (let i = 0; i < 2; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, '4'), // Correct answer
        );
      }

      // Wait for timeout to trigger
      await new Promise((res) => setTimeout(res, config.timeout * 1000 + 200));

      const result = await gameRepository.getGameById(gameId);

      expect(result?.status).toEqual(GameStatus.Finished);
      expect(result?.player1.score).toBe(6); // 5 correct + 1 bonus
      expect(result?.player2.score).toBe(3); // 3 correct, no bonus
      expect(result?.player1.status).toBe(PlayerGameStatus.WINNER);
      expect(result?.player2.status).toBe(PlayerGameStatus.LOSER);
    });

    it('should not finish game by timeout if game is already finished', async () => {
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');

      // Create a finished game
      const { gameId } = await createFinishedGameWithScores(user1, user2, 5, 3);

      const gameBeforeTimeout = await gameRepository.getGameById(gameId);
      const initialPlayer1Score = gameBeforeTimeout?.player1.score;
      const initialPlayer2Score = gameBeforeTimeout?.player2.score;

      // Wait for timeout (even though game is already finished)
      await new Promise((res) => setTimeout(res, config.timeout * 1000 + 200));

      const result = await gameRepository.getGameById(gameId);

      expect(result?.status).toEqual(GameStatus.Finished);
      // Scores should remain unchanged
      expect(result?.player1.score).toBe(initialPlayer1Score);
      expect(result?.player2.score).toBe(initialPlayer2Score);
    });
  });
});
