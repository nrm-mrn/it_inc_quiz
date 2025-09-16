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
import { GetStatisticsForUserQuery } from '../queries/get-statistics-for-user';
import {
  GetTopUsers,
  GetTopUsersQueryHandler,
} from '../queries/get-top-users.query';
import { GetTopUsersQueryParams } from '../../api/input-dto/get-top-users.input-dto';

describe('Get History Of Games For User Query Handler Integration Test', () => {
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
    for (const _n of questions) {
      await answerCommandHandler.execute(
        new AnswerQuestionCommand(user1.id, '4'), // Assuming correct answer
      );
    }

    // Player 2 answers all questions incorrectly
    for (const _n of questions) {
      await answerCommandHandler.execute(
        new AnswerQuestionCommand(user2.id, 'wrong answer'),
      );
    }

    return { gameId };
  }

  describe('execute', () => {
    it('should return emty user top object with no players', async () => {
      const q = new GetTopUsersQueryParams();
      // Act
      const result = await getTopUsers.execute(new GetTopUsers(q));

      // Assert
      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.pagesCount).toBe(0);
    });

    it('should return top with two users', async () => {
      // Arrange
      const user1 = await createTestUser('testuser1', 'test1@example.com');
      const user2 = await createTestUser('testuser2', 'test2@example.com');

      await createFinishedGame(user1, user2);
      const q = new GetTopUsersQueryParams();

      // Act
      const result = await getTopUsers.execute(new GetTopUsers(q));

      console.log(result);
      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.pagesCount).toBe(1);

      expect(result.items[0].avgScores).toBe(6);
      expect(result.items[1].avgScores).toBe(0);
    });
  });
});
