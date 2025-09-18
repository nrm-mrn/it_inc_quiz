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
import { UUID } from 'crypto';
import {
  GetTopUsers,
  GetTopUsersQueryHandler,
} from '../queries/get-top-users.query';
import {
  GetTopUsersQueryParams,
  TopUsersSortBy,
} from '../../api/input-dto/get-top-users.input-dto';
import { SortDirection } from 'src/core/dto/base.query-params.input-dto';

describe('Get Top Users Query Handler Integration Test', () => {
  let app: TestingModule;
  let answerCommandHandler: AnswerQuestionCommandHandler;
  let connectCommandHandler: ConnectCommandHandler;
  let gameRepository: GameRepository;
  let questionsRepository: QuestionsRepository;
  let usersRepository: UsersRepository;
  let testingApiService: TestingAPIService;
  let getTopUsers: GetTopUsersQueryHandler;

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
        GetTopUsersQueryHandler,
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
    getTopUsers = app.get<GetTopUsersQueryHandler>(GetTopUsersQueryHandler);
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

  // Helper function to create multiple users with different statistics
  async function createUsersWithVariedStats(): Promise<User[]> {
    const users: User[] = [];

    // Create 15 users for comprehensive testing
    for (let i = 1; i <= 15; i++) {
      const user = await createTestUser(`user${i}`, `user${i}@example.com`);
      users.push(user);
    }

    // Create games with varied outcomes
    // User1: High avg score, multiple wins
    await createFinishedGameWithScores(users[0], users[1], 5, 2); // user1 wins
    await createFinishedGameWithScores(users[0], users[2], 4, 1); // user1 wins
    await createFinishedGameWithScores(users[0], users[3], 3, 3); // draw

    // User2: Medium avg score, mixed results
    await createFinishedGameWithScores(users[1], users[4], 3, 1); // user2 wins
    await createFinishedGameWithScores(users[1], users[5], 1, 4); // user2 loses

    // User3: Low avg score, mostly losses
    await createFinishedGameWithScores(users[2], users[6], 1, 3); // user3 loses
    await createFinishedGameWithScores(users[2], users[7], 0, 2); // user3 loses

    // User4: Only one game, high score
    await createFinishedGameWithScores(users[3], users[8], 5, 0); // user4 wins

    // User5: Multiple games, consistent medium performance
    await createFinishedGameWithScores(users[4], users[9], 2, 2); // draw
    await createFinishedGameWithScores(users[4], users[10], 2, 1); // user5 wins
    await createFinishedGameWithScores(users[4], users[11], 2, 3); // user5 loses

    // User6: Active game (should be included in statistics)
    await createActiveGame(users[5], users[12]);

    // User7: Pending game (should be included in statistics)
    await createPendingGame(users[6]);

    return users;
  }

  describe('Basic functionality', () => {
    it('should return empty user top object with no players', async () => {
      const q = new GetTopUsersQueryParams();

      const result = await getTopUsers.execute(new GetTopUsers(q));

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.pagesCount).toBe(0);
    });

    it('should return top with two users from finished game', async () => {
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');

      await createFinishedGameWithScores(user1, user2, 5, 0);
      const q = new GetTopUsersQueryParams();

      const result = await getTopUsers.execute(new GetTopUsers(q));

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.pagesCount).toBe(1);

      // Check that user1 has higher score and comes first (default sorting)
      expect(result.items[0].avgScores).toBe(6); // 5 correct + 1 bonus
      expect(result.items[0].player.login).toBe('testuser1');
      expect(result.items[1].avgScores).toBe(0);
      expect(result.items[1].player.login).toBe('testuser2');
    });

    it('should include statistics from active games', async () => {
      const user1 = await createTestUser('activeuser1', 'active1@example.com');
      const user2 = await createTestUser('activeuser2', 'active2@example.com');

      await createActiveGame(user1, user2);
      const q = new GetTopUsersQueryParams();

      const result = await getTopUsers.execute(new GetTopUsers(q));

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      // Both should have 0 scores but be included
      expect(result.items[0].sumScore).toBe(0);
      expect(result.items[1].sumScore).toBe(0);
    });

    it('should include statistics from pending games', async () => {
      const user1 = await createTestUser(
        'pendinguser1',
        'pending1@example.com',
      );

      await createPendingGame(user1);
      const q = new GetTopUsersQueryParams();

      const result = await getTopUsers.execute(new GetTopUsers(q));

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.items[0].sumScore).toBe(0);
      expect(result.items[0].player.login).toBe('pendinguser1');
    });
  });

  describe('Default sorting', () => {
    it('should sort by avgScores DESC, then sumScore DESC by default', async () => {
      await createUsersWithVariedStats();
      const q = new GetTopUsersQueryParams();

      const result = await getTopUsers.execute(new GetTopUsers(q));

      expect(result.items.length).toBeGreaterThan(0);

      // Verify default sorting is applied
      for (let i = 0; i < result.items.length - 1; i++) {
        const current = result.items[i];
        const next = result.items[i + 1];

        // First sort by avgScores DESC
        if (current.avgScores !== next.avgScores) {
          expect(current.avgScores).toBeGreaterThanOrEqual(next.avgScores);
        } else {
          // Then by sumScore DESC if avgScores are equal
          expect(current.sumScore).toBeGreaterThanOrEqual(next.sumScore);
        }
      }
    });
  });

  describe('Custom sorting', () => {
    it('should sort by sumScore ASC when specified', async () => {
      await createUsersWithVariedStats();
      const q = new GetTopUsersQueryParams();
      q.sort = [{ field: TopUsersSortBy.SumScore, order: SortDirection.ASC }];

      const result = await getTopUsers.execute(new GetTopUsers(q));

      // Verify ascending order by sumScore
      for (let i = 0; i < result.items.length - 1; i++) {
        expect(result.items[i].sumScore).toBeLessThanOrEqual(
          result.items[i + 1].sumScore,
        );
      }
    });

    it('should sort by gamesCount DESC when specified', async () => {
      await createUsersWithVariedStats();
      const q = new GetTopUsersQueryParams();
      q.sort = [
        { field: TopUsersSortBy.GamesCount, order: SortDirection.DESC },
      ];

      const result = await getTopUsers.execute(new GetTopUsers(q));

      // Verify descending order by gamesCount
      for (let i = 0; i < result.items.length - 1; i++) {
        expect(result.items[i].gamesCount).toBeGreaterThanOrEqual(
          result.items[i + 1].gamesCount,
        );
      }
    });

    it('should sort by winsCount DESC when specified', async () => {
      await createUsersWithVariedStats();
      const q = new GetTopUsersQueryParams();
      q.sort = [{ field: TopUsersSortBy.WinsCount, order: SortDirection.DESC }];

      const result = await getTopUsers.execute(new GetTopUsers(q));

      // Verify descending order by winsCount
      for (let i = 0; i < result.items.length - 1; i++) {
        expect(result.items[i].winsCount).toBeGreaterThanOrEqual(
          result.items[i + 1].winsCount,
        );
      }
    });

    // it('should sort by login ASC when specified', async () => {
    //   await createUsersWithVariedStats();
    //   const q = new GetTopUsersQueryParams();
    //   q.sortBy = [{ field: TopUsersSortBy.Login, order: SortDirection.ASC }];
    //
    //   const result = await getTopUsers.execute(new GetTopUsers(q));
    //
    //   // Verify ascending alphabetical order by login
    //   for (let i = 0; i < result.items.length - 1; i++) {
    //     expect(
    //       result.items[i].player.login.localeCompare(
    //         result.items[i + 1].player.login,
    //       ),
    //     ).toBeLessThanOrEqual(0);
    //   }
    // });

    it('should handle multiple sorting criteria', async () => {
      await createUsersWithVariedStats();
      const q = new GetTopUsersQueryParams();
      q.sort = [
        { field: TopUsersSortBy.GamesCount, order: SortDirection.DESC },
        { field: TopUsersSortBy.AvgScores, order: SortDirection.DESC },
      ];

      const result = await getTopUsers.execute(new GetTopUsers(q));

      // Verify multi-level sorting
      for (let i = 0; i < result.items.length - 1; i++) {
        const current = result.items[i];
        const next = result.items[i + 1];

        if (current.gamesCount !== next.gamesCount) {
          expect(current.gamesCount).toBeGreaterThanOrEqual(next.gamesCount);
        } else {
          expect(current.avgScores).toBeGreaterThanOrEqual(next.avgScores);
        }
      }
    });
  });

  describe('Pagination', () => {
    it('should return first page with default page size', async () => {
      await createUsersWithVariedStats();
      const q = new GetTopUsersQueryParams();

      const result = await getTopUsers.execute(new GetTopUsers(q));

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.items.length).toBeLessThanOrEqual(10);
    });

    it('should return correct page with custom page size', async () => {
      await createUsersWithVariedStats();
      const q = new GetTopUsersQueryParams();
      q.pageSize = 5;
      q.pageNumber = 1;

      const result = await getTopUsers.execute(new GetTopUsers(q));

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(5);
      expect(result.items.length).toBeLessThanOrEqual(5);
    });

    it('should return second page correctly', async () => {
      await createUsersWithVariedStats();
      const q = new GetTopUsersQueryParams();
      q.pageSize = 5;
      q.pageNumber = 2;

      const result = await getTopUsers.execute(new GetTopUsers(q));

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(5);
      expect(result.items.length).toBeLessThanOrEqual(5);
    });

    it('should calculate total pages correctly', async () => {
      await createUsersWithVariedStats();
      const q = new GetTopUsersQueryParams();
      q.pageSize = 3;

      const result = await getTopUsers.execute(new GetTopUsers(q));

      const expectedPages = Math.ceil(result.totalCount / 3);
      expect(result.pagesCount).toBe(expectedPages);
    });

    it('should return empty items for page beyond total pages', async () => {
      await createUsersWithVariedStats();
      const q = new GetTopUsersQueryParams();
      q.pageSize = 5;
      q.pageNumber = 999; // Way beyond available pages

      const result = await getTopUsers.execute(new GetTopUsers(q));

      expect(result.items).toEqual([]);
      expect(result.page).toBe(999);
    });

    it('should maintain consistent total count across pages', async () => {
      await createUsersWithVariedStats();

      const q1 = new GetTopUsersQueryParams();
      q1.pageSize = 5;
      q1.pageNumber = 1;

      const q2 = new GetTopUsersQueryParams();
      q2.pageSize = 5;
      q2.pageNumber = 2;

      const result1 = await getTopUsers.execute(new GetTopUsers(q1));
      const result2 = await getTopUsers.execute(new GetTopUsers(q2));

      expect(result1.totalCount).toBe(result2.totalCount);
    });
  });

  describe('Statistics accuracy', () => {
    it('should calculate correct win/loss/draw counts', async () => {
      const user1 = await createTestUser('statuser1', 'stat1@example.com');
      const user2 = await createTestUser('statuser2', 'stat2@example.com');
      const user3 = await createTestUser('statuser3', 'stat3@example.com');

      // User1: 1 win, 1 loss, 1 draw
      await createFinishedGameWithScores(user1, user2, 5, 2); // user1 wins
      await createFinishedGameWithScores(user3, user1, 4, 1); // user1 loses
      await createFinishedGameWithScores(user1, user2, 2, 3); // draw

      const q = new GetTopUsersQueryParams();
      const result = await getTopUsers.execute(new GetTopUsers(q));

      const user1Stats = result.items.find(
        (item) => item.player.login === 'statuser1',
      );
      expect(user1Stats).toBeDefined();
      expect(user1Stats!.gamesCount).toBe(3);
      expect(user1Stats!.winsCount).toBe(1);
      expect(user1Stats!.lossesCount).toBe(1);
      expect(user1Stats!.drawsCount).toBe(1);
    });

    it('should calculate correct sum and average scores', async () => {
      const user1 = await createTestUser('avguser1', 'avg1@example.com');
      const user2 = await createTestUser('avguser2', 'avg2@example.com');

      // User1 plays 2 games with scores 6 and 4
      await createFinishedGameWithScores(user1, user2, 5, 0); // user1 gets 6 points
      await createFinishedGameWithScores(user1, user2, 3, 0); // user1 gets 4 points

      const q = new GetTopUsersQueryParams();
      const result = await getTopUsers.execute(new GetTopUsers(q));

      const user1Stats = result.items.find(
        (item) => item.player.login === 'avguser1',
      );
      expect(user1Stats).toBeDefined();
      expect(user1Stats!.sumScore).toBe(10); // 6 + 4
      expect(user1Stats!.avgScores).toBe(5); // 10 / 2
    });
  });

  describe('Edge cases', () => {
    it('should handle users with only pending games', async () => {
      const user1 = await createTestUser('pendingonly', 'pending@example.com');
      await createPendingGame(user1);

      const q = new GetTopUsersQueryParams();
      const result = await getTopUsers.execute(new GetTopUsers(q));

      expect(result.items).toHaveLength(1);
      expect(result.items[0].gamesCount).toBe(1);
      expect(result.items[0].sumScore).toBe(0);
      expect(result.items[0].avgScores).toBe(0);
      expect(result.items[0].winsCount).toBe(0);
      expect(result.items[0].lossesCount).toBe(0);
      expect(result.items[0].drawsCount).toBe(0);
    });

    it('should handle very large page numbers gracefully', async () => {
      const user1 = await createTestUser('singleuser', 'single@example.com');
      await createPendingGame(user1);

      const q = new GetTopUsersQueryParams();
      q.pageNumber = 1000000;

      const result = await getTopUsers.execute(new GetTopUsers(q));

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(1);
      expect(result.page).toBe(1000000);
    });

    it('should handle page size of 1', async () => {
      await createUsersWithVariedStats();

      const q = new GetTopUsersQueryParams();
      q.pageSize = 1;
      q.pageNumber = 1;

      const result = await getTopUsers.execute(new GetTopUsers(q));

      expect(result.items).toHaveLength(1);
      expect(result.pageSize).toBe(1);
      expect(result.pagesCount).toBe(result.totalCount);
    });
  });
});
