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
  GetGameQuery,
  GetGameQueryHandler,
} from '../queries/get-game-pair-by-id.query';
import {
  GamePairViewDto,
  GameStatuses,
} from '../../api/view-dto/game-pair.view-dto';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import { UUID } from 'crypto';
import { AnswerStatuses } from '../../api/view-dto/answer.view-dto';

describe('Get Game Pair Query Handler Integration Test', () => {
  let app: TestingModule;
  let answerCommandHandler: AnswerQuestionCommandHandler;
  let connectCommandHandler: ConnectCommandHandler;
  let gameRepository: GameRepository;
  let questionsRepository: QuestionsRepository;
  let usersRepository: UsersRepository;
  let testingApiService: TestingAPIService;
  let getGameQueryHandler: GetGameQueryHandler;

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
        GetGameQueryHandler,
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
    getGameQueryHandler = app.get<GetGameQueryHandler>(GetGameQueryHandler);
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
  async function createPendingGame(): Promise<{
    gameId: UUID;
    user1: User;
  }> {
    const user1 = await createTestUser('player1', 'player1@example.com');
    await createPublishedQuestions();

    const gameId = await connectCommandHandler.execute(
      new ConnectCommand(user1.id),
    );

    return { gameId, user1 };
  }

  // Helper function to create an active game with two players
  async function createActiveGame(): Promise<{
    gameId: UUID;
    user1: User;
    user2: User;
  }> {
    const user1 = await createTestUser('player1', 'player1@example.com');
    const user2 = await createTestUser('player2', 'player2@example.com');
    await createPublishedQuestions();

    // Connect both players to create active game
    const gameId = await connectCommandHandler.execute(
      new ConnectCommand(user1.id),
    );
    await connectCommandHandler.execute(new ConnectCommand(user2.id));

    return { gameId, user1, user2 };
  }

  // Helper function to create a finished game
  async function createFinishedGame(): Promise<{
    gameId: UUID;
    user1: User;
    user2: User;
  }> {
    const { gameId, user1, user2 } = await createActiveGame();

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

    return { gameId, user1, user2 };
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
    expect(typeof dto.pairCreateDate).toBe('string');
    expect(() => new Date(dto.pairCreateDate)).not.toThrow();

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
    it('should return correct pending game pair', async () => {
      const { gameId, user1 } = await createPendingGame();

      const result = await getGameQueryHandler.execute(
        new GetGameQuery(gameId, user1.id),
      );

      validateGamePairViewDto(result);
      expect(result.status).toBe(GameStatuses.PENDING);
      expect(result.secondPlayerProgress).toBeNull();
      expect(result.questions).toBeNull();
      expect(result.startGameDate).toBeNull();
      expect(result.finishGameDate).toBeNull();
      expect(result.firstPlayerProgress.answers).toHaveLength(0);
      expect(result.firstPlayerProgress.score).toBe(0);
      expect(result.firstPlayerProgress.player.login).toBe('player1');
    });

    it('should return correct active game pair', async () => {
      const { gameId, user1 } = await createActiveGame();

      const result = await getGameQueryHandler.execute(
        new GetGameQuery(gameId, user1.id),
      );

      validateGamePairViewDto(result);
      expect(result.status).toBe(GameStatuses.ACTIVE);
      expect(result.secondPlayerProgress).not.toBeNull();
      expect(result.questions).not.toBeNull();
      expect(result.questions).toHaveLength(5); // We created 5 questions
      expect(result.startGameDate).not.toBeNull();
      expect(result.finishGameDate).toBeNull();
      expect(result.firstPlayerProgress.player.login).toBe('player1');
      expect(result.secondPlayerProgress!.player.login).toBe('player2');
      expect(result.firstPlayerProgress.answers).toHaveLength(0);
      expect(result.secondPlayerProgress!.answers).toHaveLength(0);
      expect(result.firstPlayerProgress.score).toBe(0);
      expect(result.secondPlayerProgress!.score).toBe(0);
    });

    it('should return correct finished game pair', async () => {
      const { gameId, user1 } = await createFinishedGame();

      const result = await getGameQueryHandler.execute(
        new GetGameQuery(gameId, user1.id),
      );

      validateGamePairViewDto(result);
      expect(result.status).toBe(GameStatuses.FINISHED);
      expect(result.secondPlayerProgress).not.toBeNull();
      expect(result.questions).not.toBeNull();
      expect(result.questions).toHaveLength(5);
      expect(result.startGameDate).not.toBeNull();
      expect(result.finishGameDate).not.toBeNull();
      expect(result.firstPlayerProgress.player.login).toBe('player1');
      expect(result.secondPlayerProgress!.player.login).toBe('player2');
      expect(result.firstPlayerProgress.answers.length).toBeGreaterThan(0);
      expect(result.secondPlayerProgress!.answers.length).toBeGreaterThan(0);
    });

    it('should 404 when game id does not exist', async () => {
      const user1 = await createTestUser('player1', 'player1@example.com');
      const nonExistentGameId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

      await expect(
        getGameQueryHandler.execute(
          new GetGameQuery(nonExistentGameId, user1.id),
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          code: DomainExceptionCode.NotFound,
          message: 'Game with provided id does not exist',
        }),
      );
    });

    it('should 403 when user is not game participant', async () => {
      const { gameId } = await createPendingGame();
      const nonParticipantUser = await createTestUser(
        'nonparticipant',
        'nonparticipant@example.com',
      );

      await expect(
        getGameQueryHandler.execute(
          new GetGameQuery(gameId, nonParticipantUser.id),
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          code: DomainExceptionCode.Forbidden,
          message: 'User is not a participant in the provided game',
        }),
      );
    });
  });
});
