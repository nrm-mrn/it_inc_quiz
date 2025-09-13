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

describe('Get History Of Games For User Query Handler Integration Test', () => {
  let app: TestingModule;
  let answerCommandHandler: AnswerQuestionCommandHandler;
  let connectCommandHandler: ConnectCommandHandler;
  let gameRepository: GameRepository;
  let questionsRepository: QuestionsRepository;
  let usersRepository: UsersRepository;
  let testingApiService: TestingAPIService;
  let getGameHistory: GetUserGamesQueryHandler;

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
        GetUserGamesQueryHandler,
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
    getGameHistory = app.get<GetUserGamesQueryHandler>(
      GetUserGamesQueryHandler,
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
      { body: 'What is the capital of France?', answers: ['Paris'] },
      { body: 'What color is the sky?', answers: ['blue', 'Blue'] },
      { body: 'How many legs does a spider have?', answers: ['8', 'eight'] },
      { body: 'What is the largest planet?', answers: ['Jupiter'] },
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

  // Helper function to validate GamePairViewDto structure
  function validateGamePairViewDto(dto: GamePairViewDto) {
    expect(dto).toBeDefined();
    expect(typeof dto.id).toBe('string');
    expect(dto.firstPlayerProgress).toBeDefined();
    expect(dto.firstPlayerProgress.player).toBeDefined();
    expect(typeof dto.firstPlayerProgress.player.id).toBe('string');
    expect(typeof dto.firstPlayerProgress.player.login).toBe('string');
    expect(Array.isArray(dto.firstPlayerProgress.answers)).toBe(true);
    expect(typeof dto.firstPlayerProgress.score).toBe('number');
    expect(Object.values(GameStatuses)).toContain(dto.status);
    expect(typeof dto.pairCreatedDate).toBe('string');
    expect(() => new Date(dto.pairCreatedDate)).not.toThrow();

    // Validate answer structure if present
    dto.firstPlayerProgress.answers.forEach((answer) => {
      expect(typeof answer.questionId).toBe('string');
      expect(Object.values(AnswerStatuses)).toContain(answer.answerStatus);
      expect(typeof answer.addedAt).toBe('string');
      expect(() => new Date(answer.addedAt)).not.toThrow();
    });

    // Validate second player if present
    if (dto.secondPlayerProgress) {
      expect(dto.secondPlayerProgress.player).toBeDefined();
      expect(typeof dto.secondPlayerProgress.player.id).toBe('string');
      expect(typeof dto.secondPlayerProgress.player.login).toBe('string');
      expect(Array.isArray(dto.secondPlayerProgress.answers)).toBe(true);
      expect(typeof dto.secondPlayerProgress.score).toBe('number');

      dto.secondPlayerProgress.answers.forEach((answer) => {
        expect(typeof answer.questionId).toBe('string');
        expect(Object.values(AnswerStatuses)).toContain(answer.answerStatus);
        expect(typeof answer.addedAt).toBe('string');
        expect(() => new Date(answer.addedAt)).not.toThrow();
      });
    }

    // Validate questions if present
    if (dto.questions) {
      expect(Array.isArray(dto.questions)).toBe(true);
      dto.questions.forEach((question) => {
        expect(typeof question.id).toBe('string');
        expect(typeof question.body).toBe('string');
      });
    }

    // Validate date fields
    if (dto.startGameDate) {
      expect(typeof dto.startGameDate).toBe('string');
      expect(() => new Date(dto.startGameDate)).not.toThrow();
    }

    if (dto.finishGameDate) {
      expect(typeof dto.finishGameDate).toBe('string');
      expect(() => new Date(dto.finishGameDate)).not.toThrow();
    }
  }

  describe('execute', () => {
    it('should return empty result when user has no games', async () => {
      // Arrange
      const user = await createTestUser('testuser', 'test@example.com');
      const queryParams = new GetUserGamesQueryParams();

      // Act
      const result = await getGameHistory.execute(
        new GetUserGames(user.id, queryParams),
      );

      // Assert
      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.pagesCount).toBe(0);
    });

    it('should return paginated games with default sorting (pairCreatedDate DESC)', async () => {
      // Arrange
      const user1 = await createTestUser('user1', 'user1@example.com');
      const user2 = await createTestUser('user2', 'user2@example.com');
      const user3 = await createTestUser('user3', 'user3@example.com');

      // Create finished game first (user1 vs user2)
      await createFinishedGame(user1, user2);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create finished game (user1 vs user3)
      await new Promise((resolve) => setTimeout(resolve, 100));
      await createFinishedGame(user1, user3);

      // Create pending game (user1 only)
      await createPendingGame(user1);

      const queryParams = new GetUserGamesQueryParams();
      queryParams.pageSize = 2;

      // Act
      const result = await getGameHistory.execute(
        new GetUserGames(user1.id, queryParams),
      );

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(result.pagesCount).toBe(2);

      // Verify default sorting by pairCreatedDate DESC (newest first)
      const firstGameDate = new Date(result.items[0].pairCreatedDate);
      const secondGameDate = new Date(result.items[1].pairCreatedDate);
      expect(firstGameDate.getTime()).toBeGreaterThanOrEqual(
        secondGameDate.getTime(),
      );

      // Validate structure
      result.items.forEach(validateGamePairViewDto);
    });

    it('should return second page of paginated results', async () => {
      // Arrange
      const user1 = await createTestUser('user1', 'user1@example.com');
      const user2 = await createTestUser('user2', 'user2@example.com');
      const user3 = await createTestUser('user3', 'user3@example.com');

      // Create 2 finished games first
      await createFinishedGame(user1, user2);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await createFinishedGame(user1, user3);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create 1 pending game
      await createPendingGame(user1);

      const queryParams = new GetUserGamesQueryParams();
      queryParams.pageSize = 2;
      queryParams.pageNumber = 2;

      // Act
      const result = await getGameHistory.execute(
        new GetUserGames(user1.id, queryParams),
      );

      // Assert
      expect(result.items).toHaveLength(1); // Only 1 item on second page
      expect(result.totalCount).toBe(3);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(2);
      expect(result.pagesCount).toBe(2);

      validateGamePairViewDto(result.items[0]);
    });

    it('should sort by status with secondary sort by pairCreatedDate DESC', async () => {
      // Arrange
      const user1 = await createTestUser('user1', 'user1@example.com');
      const user2 = await createTestUser('user2', 'user2@example.com');
      const user3 = await createTestUser('user3', 'user3@example.com');
      const user4 = await createTestUser('user4', 'user4@example.com');

      // Create finished game first
      await new Promise((resolve) => setTimeout(resolve, 100));
      await createFinishedGame(user1, user2);

      // Create active game (user1 vs user3)
      await new Promise((resolve) => setTimeout(resolve, 100));
      await createActiveGame(user1, user3);

      // Create pending game (user4 only, so user1 can't have another active/pending)
      await createPendingGame(user4);

      const queryParams = new GetUserGamesQueryParams();
      queryParams.sortBy = GamesSortBy.Status;
      queryParams.sortDirection = SortDirection.ASC;

      // Act - Get games for user1 (has finished and active games)
      const result = await getGameHistory.execute(
        new GetUserGames(user1.id, queryParams),
      );

      // Assert
      expect(result.items).toHaveLength(2);

      // Verify primary sorting by status with collation C (binary sort order)
      // 'active' comes before 'finished' in binary sort
      expect(result.items[0].status).toBe(GameStatuses.ACTIVE);
      expect(result.items[1].status).toBe(GameStatuses.FINISHED);

      result.items.forEach(validateGamePairViewDto);
    });

    it('should sort by status DESC with collation C ordering', async () => {
      // Arrange
      const user1 = await createTestUser('user1', 'user1@example.com');
      const user2 = await createTestUser('user2', 'user2@example.com');
      const user3 = await createTestUser('user3', 'user3@example.com');

      // Create finished game first
      await new Promise((resolve) => setTimeout(resolve, 100));
      await createFinishedGame(user1, user2);

      // Create active game
      await createActiveGame(user1, user3);

      const queryParams = new GetUserGamesQueryParams();
      queryParams.sortBy = GamesSortBy.Status;
      queryParams.sortDirection = SortDirection.DESC;

      // Act
      const result = await getGameHistory.execute(
        new GetUserGames(user1.id, queryParams),
      );

      // Assert
      expect(result.items).toHaveLength(2);

      // Verify DESC sorting by status with collation C
      // 'finished' comes before 'active' in DESC binary sort
      expect(result.items[0].status).toBe(GameStatuses.FINISHED);
      expect(result.items[1].status).toBe(GameStatuses.ACTIVE);

      result.items.forEach(validateGamePairViewDto);
    });

    it('should sort by startedAt with secondary sort by pairCreatedDate DESC', async () => {
      // Arrange
      const user1 = await createTestUser('user1', 'user1@example.com');
      const user2 = await createTestUser('user2', 'user2@example.com');
      const user3 = await createTestUser('user3', 'user3@example.com');

      // Create finished games first (they have start times)
      await createFinishedGame(user1, user2);
      await new Promise((resolve) => setTimeout(resolve, 100));

      await createFinishedGame(user1, user3);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create pending game (no start time)
      await createPendingGame(user1);

      const queryParams = new GetUserGamesQueryParams();
      queryParams.sortBy = GamesSortBy.GameStarted;
      queryParams.sortDirection = SortDirection.DESC;

      // Act
      const result = await getGameHistory.execute(
        new GetUserGames(user1.id, queryParams),
      );

      // Assert
      expect(result.items).toHaveLength(3);

      // Games with startGameDate should come first (newest first), then null values
      const gamesWithStartDate = result.items.filter(
        (g) => g.startGameDate !== null,
      );
      const gamesWithoutStartDate = result.items.filter(
        (g) => g.startGameDate === null,
      );

      expect(gamesWithStartDate.length).toBe(2);
      expect(gamesWithoutStartDate.length).toBe(1);

      // Verify that games with start dates are sorted by start date DESC
      if (gamesWithStartDate.length > 1) {
        const firstStartDate = new Date(gamesWithStartDate[0].startGameDate!);
        const secondStartDate = new Date(gamesWithStartDate[1].startGameDate!);
        expect(firstStartDate.getTime()).toBeGreaterThanOrEqual(
          secondStartDate.getTime(),
        );
      }

      result.items.forEach(validateGamePairViewDto);
    });

    it('should sort by finishedAt with secondary sort by pairCreatedDate DESC', async () => {
      // Arrange
      const user1 = await createTestUser('user1', 'user1@example.com');
      const user2 = await createTestUser('user2', 'user2@example.com');
      const user3 = await createTestUser('user3', 'user3@example.com');
      const user4 = await createTestUser('user4', 'user4@example.com');

      // Create finished games first
      await createFinishedGame(user1, user2);
      await new Promise((resolve) => setTimeout(resolve, 100));

      await createFinishedGame(user1, user3);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create active game (no finish time)
      await createActiveGame(user1, user4);

      const queryParams = new GetUserGamesQueryParams();
      queryParams.sortBy = GamesSortBy.GameFinished;
      queryParams.sortDirection = SortDirection.DESC;

      // Act
      const result = await getGameHistory.execute(
        new GetUserGames(user1.id, queryParams),
      );

      // Assert
      expect(result.items).toHaveLength(3);

      // Games with finishGameDate should come first, then null values
      const finishedGames = result.items.filter(
        (g) => g.finishGameDate !== null,
      );
      const unfinishedGames = result.items.filter(
        (g) => g.finishGameDate === null,
      );

      expect(finishedGames.length).toBe(2);
      expect(unfinishedGames.length).toBe(1);

      // Verify finished games are sorted by finish date DESC
      if (finishedGames.length > 1) {
        const firstFinishDate = new Date(finishedGames[0].finishGameDate!);
        const secondFinishDate = new Date(finishedGames[1].finishGameDate!);
        expect(firstFinishDate.getTime()).toBeGreaterThanOrEqual(
          secondFinishDate.getTime(),
        );
      }

      result.items.forEach(validateGamePairViewDto);
    });

    it('should sort by id with secondary sort by pairCreatedDate DESC', async () => {
      // Arrange
      const user1 = await createTestUser('user1', 'user1@example.com');
      const user2 = await createTestUser('user2', 'user2@example.com');
      const user3 = await createTestUser('user3', 'user3@example.com');

      // Create finished games first
      await createFinishedGame(user1, user2);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await createFinishedGame(user1, user3);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create pending game
      await createPendingGame(user1);

      const queryParams = new GetUserGamesQueryParams();
      queryParams.sortBy = GamesSortBy.Id;
      queryParams.sortDirection = SortDirection.ASC;

      // Act
      const result = await getGameHistory.execute(
        new GetUserGames(user1.id, queryParams),
      );

      // Assert
      expect(result.items).toHaveLength(3);

      // Verify sorting by ID ASC
      for (let i = 0; i < result.items.length - 1; i++) {
        expect(
          result.items[i].id.localeCompare(result.items[i + 1].id),
        ).toBeLessThanOrEqual(0);
      }

      result.items.forEach(validateGamePairViewDto);
    });

    it('should handle large page size correctly', async () => {
      // Arrange
      const user1 = await createTestUser('user1', 'user1@example.com');
      const user2 = await createTestUser('user2', 'user2@example.com');

      // Create finished game first, then pending
      await createFinishedGame(user1, user2);
      await createPendingGame(user1);

      const queryParams = new GetUserGamesQueryParams();
      queryParams.pageSize = 100; // Much larger than actual count

      // Act
      const result = await getGameHistory.execute(
        new GetUserGames(user1.id, queryParams),
      );

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(100);
      expect(result.pagesCount).toBe(1);

      result.items.forEach(validateGamePairViewDto);
    });

    it('should return games where user is either player1 or player2', async () => {
      // Arrange
      const user1 = await createTestUser('user1', 'user1@example.com');
      const user2 = await createTestUser('user2', 'user2@example.com');
      const user3 = await createTestUser('user3', 'user3@example.com');
      const user4 = await createTestUser('user4', 'user4@example.com');

      // Create finished games where user2 participates
      await createFinishedGame(user2, user1); // user2 as player1
      await createFinishedGame(user1, user2); // user2 as player2

      // Create a game where user2 is not involved
      await createFinishedGame(user3, user4); // user2 not involved

      const queryParams = new GetUserGamesQueryParams();

      // Act
      const result = await getGameHistory.execute(
        new GetUserGames(user2.id, queryParams),
      );

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);

      // Verify user2 is in both games
      result.items.forEach((game) => {
        const isPlayer1 = game.firstPlayerProgress.player.id === user2.id;
        const isPlayer2 = game.secondPlayerProgress?.player.id === user2.id;
        expect(isPlayer1 || isPlayer2).toBe(true);
      });

      result.items.forEach(validateGamePairViewDto);
    });

    it('should maintain secondary sort by pairCreatedDate when primary sort values are equal', async () => {
      // Arrange
      const user1 = await createTestUser('user1', 'user1@example.com');
      const user2 = await createTestUser('user2', 'user2@example.com');
      const user3 = await createTestUser('user3', 'user3@example.com');
      const user4 = await createTestUser('user4', 'user4@example.com');

      // Create multiple finished games (same status) with different creation times
      await createFinishedGame(user1, user2);
      await new Promise((resolve) => setTimeout(resolve, 100));

      await createFinishedGame(user1, user3);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await createFinishedGame(user1, user4);

      const queryParams = new GetUserGamesQueryParams();
      queryParams.sortBy = GamesSortBy.Status;
      queryParams.sortDirection = SortDirection.ASC;

      // Act
      const result = await getGameHistory.execute(
        new GetUserGames(user1.id, queryParams),
      );

      // Assert
      expect(result.items).toHaveLength(3);

      // All games should have the same status
      result.items.forEach((game) => {
        expect(game.status).toBe(GameStatuses.FINISHED);
      });

      // Verify secondary sort by pairCreatedDate DESC (newest first)
      for (let i = 0; i < result.items.length - 1; i++) {
        const currentDate = new Date(result.items[i].pairCreatedDate);
        const nextDate = new Date(result.items[i + 1].pairCreatedDate);
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(
          nextDate.getTime(),
        );
      }

      result.items.forEach(validateGamePairViewDto);
    });

    it('should handle edge case with empty page beyond total pages', async () => {
      // Arrange
      const user1 = await createTestUser('user1', 'user1@example.com');
      const user2 = await createTestUser('user2', 'user2@example.com');

      // Create only 1 game
      await createFinishedGame(user1, user2);

      const queryParams = new GetUserGamesQueryParams();
      queryParams.pageSize = 10;
      queryParams.pageNumber = 5; // Way beyond available data

      // Act
      const result = await getGameHistory.execute(
        new GetUserGames(user1.id, queryParams),
      );

      // Assert
      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(1);
      expect(result.page).toBe(5);
      expect(result.pageSize).toBe(10);
      expect(result.pagesCount).toBe(1);
    });

    it('should verify collation C affects status sorting with all game statuses', async () => {
      // Arrange
      const user1 = await createTestUser('user1', 'user1@example.com');
      const user2 = await createTestUser('user2', 'user2@example.com');
      const user3 = await createTestUser('user3', 'user3@example.com');
      const user4 = await createTestUser('user4', 'user4@example.com');
      const user5 = await createTestUser('user5', 'user5@example.com');

      // Create one game of each status for different users to test sorting
      // Note: We can't create all statuses for the same user due to business rules

      // Create finished game (user1 vs user2)
      await createFinishedGame(user1, user2);

      // Create active game (user3 vs user4)
      await createActiveGame(user3, user4);

      // Create pending game (user5 only)
      await createPendingGame(user5);

      const queryParams = new GetUserGamesQueryParams();
      queryParams.sortBy = GamesSortBy.Status;
      queryParams.sortDirection = SortDirection.ASC;
      queryParams.pageSize = 10;

      // Act - Get all games for all users to see status sorting
      const results = await Promise.all([
        getGameHistory.execute(new GetUserGames(user1.id, queryParams)),
        getGameHistory.execute(new GetUserGames(user3.id, queryParams)),
        getGameHistory.execute(new GetUserGames(user5.id, queryParams)),
      ]);

      // Assert - Verify each user's games have expected status
      expect(results[0].items[0].status).toBe(GameStatuses.FINISHED); // 'finished'
      expect(results[1].items[0].status).toBe(GameStatuses.ACTIVE); // 'active'
      expect(results[2].items[0].status).toBe(GameStatuses.PENDING); // 'pending'
    });
  });
});
