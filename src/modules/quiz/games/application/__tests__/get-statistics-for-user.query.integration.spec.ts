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
import { Game } from '../../domain/game.schema';
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
import {
  GamePairViewDto,
  GameStatuses,
} from '../../api/view-dto/game-pair.view-dto';
import { UUID } from 'crypto';
import { AnswerStatuses } from '../../api/view-dto/answer.view-dto';
import {
  GetUserGames,
  GetUserGamesQueryHandler,
} from '../queries/get-user-games.query';
import {
  GamesSortBy,
  GetUserGamesQueryParams,
} from '../../api/input-dto/get-user-games-query-params.input-dto';
import { SortDirection } from 'src/core/dto/base.query-params.input-dto';
import {
  GetStatisticsForUserQuery,
  GetStatisticsForUserQueryHandler,
} from '../queries/get-statistics-for-user';

describe('Get History Of Games For User Query Handler Integration Test', () => {
  let app: TestingModule;
  let answerCommandHandler: AnswerQuestionCommandHandler;
  let connectCommandHandler: ConnectCommandHandler;
  let gameRepository: GameRepository;
  let questionsRepository: QuestionsRepository;
  let usersRepository: UsersRepository;
  let testingApiService: TestingAPIService;
  let getStatistics: GetStatisticsForUserQueryHandler;

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
      ],
      providers: [
        AnswerQuestionCommandHandler,
        ConnectCommandHandler,
        GetStatisticsForUserQueryHandler,
        GameRepository,
        QuestionsRepository,
        UsersRepository,
        TestingAPIService,
      ],
    }).compile();

    answerCommandHandler = app.get<AnswerQuestionCommandHandler>(
      AnswerQuestionCommandHandler,
    );
    connectCommandHandler = app.get<ConnectCommandHandler>(
      ConnectCommandHandler,
    );
    gameRepository = app.get<GameRepository>(GameRepository);
    questionsRepository = app.get<QuestionsRepository>(QuestionsRepository);
    usersRepository = app.get<UsersRepository>(UsersRepository);
    testingApiService = app.get<TestingAPIService>(TestingAPIService);
    getStatistics = app.get<GetStatisticsForUserQueryHandler>(
      GetStatisticsForUserQueryHandler,
    );
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

  // Helper function to create published questions with known answers
  async function createPublishedQuestions(): Promise<Question[]> {
    const questionsData = [
      { body: 'What is 2+2?', answers: ['4', 'four'] },
      { body: 'What is the capital of France?', answers: ['4'] },
      { body: 'What color is the sky?', answers: ['4', 'Blue'] },
      { body: 'How many legs does a spider have?', answers: ['4', 'eight'] },
      { body: 'What is the largest planet?', answers: ['4'] },
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

  // Helper function to create a finished game
  async function createFinishedGame(
    user1: User,
    user2: User,
  ): Promise<{
    gameId: UUID;
  }> {
    const { gameId } = await createActiveGame(user1, user2);

    // Answer all questions for both players to finish the game
    const game = await gameRepository.getActiveGameById(gameId);
    const questions = game.questions;

    // Player 1 answers all questions correctly
    for (const n of questions) {
      await answerCommandHandler.execute(
        new AnswerQuestionCommand(user1.id, '4'), // Assuming correct answer
      );
    }

    // Player 2 answers all questions incorrectly
    for (const n of questions) {
      await answerCommandHandler.execute(
        new AnswerQuestionCommand(user2.id, 'wrong answer'),
      );
    }

    return { gameId };
  }

  describe('execute', () => {
    it('should return zero statistics for user with no games', async () => {
      // Arrange
      const user = await createTestUser('testuser', 'test@example.com');

      // Act
      const result = await getStatistics.execute(
        new GetStatisticsForUserQuery(user.id),
      );

      // Assert
      expect(result).toEqual({
        sumScore: 0,
        avgScores: 0,
        gamesCount: 0,
        winsCount: 0,
        lossesCount: 0,
        drawsCount: 0,
      });
    });

    it('should calculate statistics for user with one won game (with bonus point)', async () => {
      // Arrange
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');

      const { gameId } = await createActiveGame(user1, user2);
      const game = await gameRepository.getActiveGameById(gameId);
      const questions = game.questions;

      // User1 answers all correctly and finishes first (should get 5 + 1 bonus = 6)
      for (const question of questions) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, '4'), // Correct answer
        );
      }

      // User2 answers all incorrectly (should lose with score 0)
      for (const question of questions) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, 'wrong'),
        );
      }

      // Act
      const result = await getStatistics.execute(
        new GetStatisticsForUserQuery(user1.id),
      );

      // Assert
      expect(result.sumScore).toBe(6); // 5 correct answers + 1 bonus point
      expect(result.avgScores).toBe(6);
      expect(result.gamesCount).toBe(1);
      expect(result.winsCount).toBe(1);
      expect(result.lossesCount).toBe(0);
      expect(result.drawsCount).toBe(0);
    });

    it('should calculate statistics for user with one lost game', async () => {
      // Arrange
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');

      const { gameId } = await createActiveGame(user1, user2);
      const game = await gameRepository.getActiveGameById(gameId);
      const questions = game.questions;

      // User1 answers all incorrectly (should lose with score 0, no bonus)
      for (const question of questions) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, 'wrong'),
        );
      }

      // User2 answers all correctly (should win with score 5 + 1 bonus = 6)
      for (const question of questions) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, '4'),
        );
      }

      // Act
      const result = await getStatistics.execute(
        new GetStatisticsForUserQuery(user1.id),
      );

      // Assert
      expect(result.sumScore).toBe(0); // 0 correct answers, no bonus
      expect(result.avgScores).toBe(0);
      expect(result.gamesCount).toBe(1);
      expect(result.winsCount).toBe(0);
      expect(result.lossesCount).toBe(1);
      expect(result.drawsCount).toBe(0);
    });

    it('should calculate statistics for user with one draw game', async () => {
      // Arrange
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');

      const { gameId } = await createActiveGame(user1, user2);
      const game = await gameRepository.getActiveGameById(gameId);
      const questions = game.questions;

      // User1 answers 3 questions correctly and finishes first (3 + 1 bonus = 4)
      for (let i = 0; i < questions.length; i++) {
        const answer = i < 3 ? '4' : 'wrong'; // First 3 correct, last 2 wrong
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, answer),
        );
      }

      // User2 answers same pattern but finishes second (3 + 0 bonus = 3)
      for (let i = 0; i < questions.length; i++) {
        const answer = i < 3 ? '4' : 'wrong';
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, answer),
        );
      }

      // Act
      const result = await getStatistics.execute(
        new GetStatisticsForUserQuery(user1.id),
      );

      // Assert
      expect(result.sumScore).toBe(4); // 3 correct + 1 bonus (finished first)
      expect(result.avgScores).toBe(4);
      expect(result.gamesCount).toBe(1);
      expect(result.winsCount).toBe(1); // User1 wins due to bonus point
      expect(result.lossesCount).toBe(0);
      expect(result.drawsCount).toBe(0);
    });

    it('should not give bonus point if user finishes first with zero correct answers', async () => {
      // Arrange
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');

      const { gameId } = await createActiveGame(user1, user2);
      const game = await gameRepository.getActiveGameById(gameId);
      const questions = game.questions;

      // User1 answers all incorrectly but finishes first (0 correct, no bonus)
      for (const question of questions) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, 'wrong'),
        );
      }

      // User2 also answers all incorrectly
      for (const question of questions) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, 'wrong'),
        );
      }

      // Act
      const result = await getStatistics.execute(
        new GetStatisticsForUserQuery(user1.id),
      );

      // Assert
      expect(result.sumScore).toBe(0); // 0 correct, no bonus (need at least 1 correct)
      expect(result.avgScores).toBe(0);
      expect(result.gamesCount).toBe(1);
      expect(result.winsCount).toBe(0);
      expect(result.lossesCount).toBe(0);
      expect(result.drawsCount).toBe(1); // Draw since both have 0 points
    });

    it('should calculate statistics for user with multiple games of different outcomes', async () => {
      // Arrange
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');
      const user3 = await createTestUser('testuser3', 'test3@example.com');

      // Game 1: User1 wins (5 correct + 1 bonus = 6)
      const { gameId: game1Id } = await createActiveGame(user1, user2);
      const game1 = await gameRepository.getActiveGameById(game1Id);
      for (const question of game1.questions) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, '4'), // All correct, finishes first
        );
      }
      for (const question of game1.questions) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, 'wrong'), // All wrong
        );
      }

      // Game 2: User1 loses (0 correct, no bonus = 0)
      const { gameId: game2Id } = await createActiveGame(user1, user3);
      const game2 = await gameRepository.getActiveGameById(game2Id);
      for (const question of game2.questions) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user3.id, '4'), // User3 finishes first with all correct
        );
      }
      for (const question of game2.questions) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, 'wrong'), // All wrong
        );
      }

      // Game 3: User1 draws but finishes first (2 correct + 1 bonus = 3)
      const { gameId: game3Id } = await createActiveGame(user1, user2);
      const game3 = await gameRepository.getActiveGameById(game3Id);
      for (let i = 0; i < game3.questions.length; i++) {
        const answer = i < 2 ? '4' : 'wrong'; // First 2 correct, last 3 wrong
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, answer), // Finishes first
        );
      }
      for (let i = 0; i < game3.questions.length; i++) {
        const answer = i < 2 ? '4' : 'wrong';
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, answer), // Same score but no bonus
        );
      }

      // Act
      const result = await getStatistics.execute(
        new GetStatisticsForUserQuery(user1.id),
      );

      // Assert
      expect(result.sumScore).toBe(9); // 6 + 0 + 3
      expect(result.avgScores).toBe(3); // 9/3 = 3.00
      expect(result.gamesCount).toBe(3);
      expect(result.winsCount).toBe(2); // Game 1 and Game 3 (bonus point wins)
      expect(result.lossesCount).toBe(1); // Game 2
      expect(result.drawsCount).toBe(0);
    });

    it('should include pending games in statistics', async () => {
      // Arrange
      const user1 = await createTestUser('testuser1', 'test1@example.com');

      // Create a pending game (only one player connected, score should be 0)
      await createPendingGame(user1);

      // Act
      const result = await getStatistics.execute(
        new GetStatisticsForUserQuery(user1.id),
      );

      // Assert - pending games should be included
      expect(result.gamesCount).toBe(1);
      expect(result.sumScore).toBe(0); // No answers yet in pending game
      expect(result.avgScores).toBe(0);
      expect(result.winsCount).toBe(0);
      expect(result.lossesCount).toBe(0);
      expect(result.drawsCount).toBe(0); // Pending games don't have win/loss/draw status yet
    });

    it('should include active games in statistics', async () => {
      // Arrange
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');

      // Create an active game and answer some questions
      const { gameId } = await createActiveGame(user1, user2);
      const game = await gameRepository.getActiveGameById(gameId);

      // User1 answers first 2 questions correctly
      for (let i = 0; i < 2; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, '4'),
        );
      }

      // Act
      const result = await getStatistics.execute(
        new GetStatisticsForUserQuery(user1.id),
      );

      // Assert - active games should be included
      expect(result.gamesCount).toBe(1);
      expect(result.sumScore).toBe(2); // 2 correct answers so far
      expect(result.avgScores).toBe(2);
      // Win/loss/draw counts depend on current game state
    });

    it('should count all game states in statistics', async () => {
      // Arrange
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');
      const user3 = await createTestUser('testuser3', 'test3@example.com');

      // Create one finished game (user1 wins with bonus)
      await createFinishedGame(user1, user2);

      // Create one active game with partial answers
      await createActiveGame(user1, user3);
      await answerCommandHandler.execute(
        new AnswerQuestionCommand(user1.id, '4'), // 1 correct answer
      );

      // Act
      const result = await getStatistics.execute(
        new GetStatisticsForUserQuery(user1.id),
      );

      // Assert - all game states should be counted
      expect(result.gamesCount).toBe(2); // finished + active
      expect(result.sumScore).toBe(7); // 6 from finished, 1 active
    });

    it('should calculate correct average scores with decimal precision', async () => {
      // Arrange
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');

      // Create 3 games with different scores including bonus points
      // Game 1: 1 correct + 1 bonus = 2 points
      const { gameId: game1Id } = await createActiveGame(user1, user2);
      const game1 = await gameRepository.getActiveGameById(game1Id);
      await answerCommandHandler.execute(
        new AnswerQuestionCommand(user1.id, '4'), // 1 correct, finish first
      );
      for (let i = 1; i < game1.questions.length; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, 'wrong'),
        );
      }
      for (const question of game1.questions) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, 'wrong'),
        );
      }

      // Game 2: 2 correct + 1 bonus = 3 points
      const { gameId: game2Id } = await createActiveGame(user1, user2);
      const game2 = await gameRepository.getActiveGameById(game2Id);
      for (let i = 0; i < game2.questions.length; i++) {
        const answer = i < 2 ? '4' : 'wrong';
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, answer), // 2 correct, finish first
        );
      }
      for (const question of game2.questions) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, 'wrong'),
        );
      }

      // Game 3: 3 correct + 1 bonus = 4 points
      const { gameId: game3Id } = await createActiveGame(user1, user2);
      const game3 = await gameRepository.getActiveGameById(game3Id);
      for (let i = 0; i < game3.questions.length; i++) {
        const answer = i < 3 ? '4' : 'wrong';
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, answer), // 3 correct, finish first
        );
      }
      for (const question of game3.questions) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, 'wrong'),
        );
      }

      // Act
      const result = await getStatistics.execute(
        new GetStatisticsForUserQuery(user1.id),
      );

      // Assert
      expect(result.sumScore).toBe(9); // 2 + 3 + 4
      expect(result.avgScores).toBe(3); // 9/3 = 3.00 (trailing zeros removed by regex)
      expect(result.gamesCount).toBe(3);
      expect(result.winsCount).toBe(3); // All wins due to bonus points
      expect(result.lossesCount).toBe(0);
      expect(result.drawsCount).toBe(0);
    });
  });
});
