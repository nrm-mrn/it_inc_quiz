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
import { DomainException } from 'src/core/exceptions/domain-exceptions';

describe('Answer Question Command Handler Integration Test', () => {
  let app: TestingModule;
  let answerCommandHandler: AnswerQuestionCommandHandler;
  let connectCommandHandler: ConnectCommandHandler;
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

  // Helper function to create an active game with two players
  async function createActiveGame(): Promise<{
    game: Game;
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

    const game = await gameRepository.getActiveGameById(gameId);
    return { game, user1, user2 };
  }

  describe('execute', () => {
    it('should answer first question correctly and increase score', async () => {
      const { game, user1 } = await createActiveGame();
      const firstQuestion = await questionsRepository.getQuestionById(
        game.questions[0].questionId,
      );
      const correctAnswer = firstQuestion!.correctAnswers.answers[0];

      const command = new AnswerQuestionCommand(user1.id, correctAnswer);
      const answerId = await answerCommandHandler.execute(command);

      expect(answerId).toBeDefined();

      // Verify game state
      const updatedGame = await gameRepository.getActiveGameById(game.id);
      const player1 =
        updatedGame.player1.userId === user1.id
          ? updatedGame.player1
          : updatedGame.player2;

      expect(player1!.score).toBe(1);
      expect(player1!.answers).toHaveLength(1);
      expect(player1!.answers[0].status).toBe(true);
      expect(player1!.answers[0].questionId).toBe(firstQuestion!.id);
      expect(updatedGame.status).toBe(GameStatus.Active);
    });

    it('should answer first question incorrectly and not increase score', async () => {
      const { game, user1 } = await createActiveGame();
      const incorrectAnswer = 'wrong answer';

      const command = new AnswerQuestionCommand(user1.id, incorrectAnswer);
      const answerId = await answerCommandHandler.execute(command);

      expect(answerId).toBeDefined();

      // Verify game state
      const updatedGame = await gameRepository.getActiveGameById(game.id);
      const player1 =
        updatedGame.player1.userId === user1.id
          ? updatedGame.player1
          : updatedGame.player2;

      expect(player1!.score).toBe(0);
      expect(player1!.answers).toHaveLength(1);
      expect(player1!.answers[0].status).toBe(false);
      expect(updatedGame.status).toBe(GameStatus.Active);
    });

    it('should answer questions in correct order', async () => {
      const { game, user1 } = await createActiveGame();

      // Answer first 3 questions
      for (let i = 0; i < 3; i++) {
        const question = await questionsRepository.getQuestionById(
          game.questions[i].questionId,
        );
        const correctAnswer = question!.correctAnswers.answers[0];

        const command = new AnswerQuestionCommand(user1.id, correctAnswer);
        await answerCommandHandler.execute(command);

        // Verify question order
        const updatedGame = await gameRepository.getActiveGameById(game.id);
        const player1 =
          updatedGame.player1.userId === user1.id
            ? updatedGame.player1
            : updatedGame.player2;

        expect(player1!.answers).toHaveLength(i + 1);
        expect(player1!.answers[i].questionId).toBe(question!.id);
        expect(player1!.score).toBe(i + 1);
      }
    });

    it('should handle both players answering questions simultaneously', async () => {
      const { game, user1, user2 } = await createActiveGame();

      // Both players answer first question
      const firstQuestion = await questionsRepository.getQuestionById(
        game.questions[0].questionId,
      );
      const correctAnswer = firstQuestion!.correctAnswers.answers[0];

      await Promise.all([
        answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, correctAnswer),
        ),
        answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, 'wrong answer'),
        ),
      ]);

      const updatedGame = await gameRepository.getActiveGameById(game.id);
      const player1 =
        updatedGame.player1.userId === user1.id
          ? updatedGame.player1
          : updatedGame.player2;
      const player2 =
        updatedGame.player1.userId === user2.id
          ? updatedGame.player1
          : updatedGame.player2;

      expect(player1!.score).toBe(1);
      expect(player1!.answers).toHaveLength(1);
      expect(player1!.answers[0].status).toBe(true);

      expect(player2!.score).toBe(0);
      expect(player2!.answers).toHaveLength(1);
      expect(player2!.answers[0].status).toBe(false);

      expect(updatedGame.status).toBe(GameStatus.Active);
    });

    it('should finish game when both players answer all questions', async () => {
      const { game, user1, user2 } = await createActiveGame();

      // Player 1 answers all questions correctly
      for (let i = 0; i < 5; i++) {
        const question = await questionsRepository.getQuestionById(
          game.questions[i].questionId,
        );
        const correctAnswer = question!.correctAnswers.answers[0];
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, correctAnswer),
        );
      }

      // Player 2 answers first 4 questions incorrectly
      for (let i = 0; i < 4; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, 'wrong'),
        );
      }

      // Player 2 answers last question - this should finish the game
      await answerCommandHandler.execute(
        new AnswerQuestionCommand(user2.id, 'wrong'),
      );

      const finishedGame = await gameRepository
        .getActiveGameForUserOrFail(user1.id)
        .catch(() => null);

      // Game should no longer be active, so this should fail
      expect(finishedGame).toBeNull();

      const isUser1InPair = await gameRepository.checkIfUserInPair(user1.id);
      const isUser2InPair = await gameRepository.checkIfUserInPair(user2.id);
      expect(isUser1InPair).toBe(false);
      expect(isUser2InPair).toBe(false);
    });

    it('should give bonus point to player who finishes first with at least one correct answer', async () => {
      const { game, user1, user2 } = await createActiveGame();

      // Player 1 answers all questions correctly (finishes first)
      for (let i = 0; i < 5; i++) {
        const question = await questionsRepository.getQuestionById(
          game.questions[i].questionId,
        );
        const correctAnswer = question!.correctAnswers.answers[0];
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, correctAnswer),
        );
      }

      // Player 2 answers 4 questions incorrectly
      for (let i = 0; i < 4; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, 'wrong'),
        );
      }

      // Get game state before final answer
      const currentGame = await gameRepository.getActiveGameById(game.id);
      const player1BeforeFinal =
        currentGame.player1.userId === user1.id
          ? currentGame.player1
          : currentGame.player2;

      expect(player1BeforeFinal!.score).toBe(5); // 5 correct answers

      // Player 2 answers last question - this finishes the game and should give bonus to player1
      await answerCommandHandler.execute(
        new AnswerQuestionCommand(user2.id, 'wrong'),
      );

      // Get the finished game to verify bonus was awarded
      const finishedGame = await gameRepository.getGameById(game.id);
      expect(finishedGame).toBeDefined();
      expect(finishedGame!.status).toBe(GameStatus.Finished);

      const player1Final =
        finishedGame!.player1.userId === user1.id
          ? finishedGame!.player1
          : finishedGame!.player2;

      expect(player1Final!.score).toBe(6); // 5 correct answers + 1 bonus

      // Verify no active game exists
      const activeGame = await gameRepository
        .getActiveGameForUserOrFail(user1.id)
        .catch(() => null);
      expect(activeGame).toBeNull();
    });

    it('should not give bonus point to player who finishes first with zero correct answers', async () => {
      const { game, user1, user2 } = await createActiveGame();

      // Player 1 answers all questions incorrectly (finishes first)
      for (let i = 0; i < 5; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, 'wrong'),
        );
      }

      // Player 2 answers 4 questions
      for (let i = 0; i < 4; i++) {
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user2.id, 'wrong'),
        );
      }

      // Get game state before final answer
      const currentGame = await gameRepository.getActiveGameById(game.id);
      const player1BeforeFinal =
        currentGame.player1.userId === user1.id
          ? currentGame.player1
          : currentGame.player2;

      expect(player1BeforeFinal!.score).toBe(0); // 0 correct answers

      // Player 2 answers last question - player1 should not get bonus (score = 0)
      await answerCommandHandler.execute(
        new AnswerQuestionCommand(user2.id, 'wrong'),
      );

      // Get the finished game to verify no bonus was awarded
      const finishedGame = await gameRepository.getGameById(game.id);
      expect(finishedGame).toBeDefined();
      expect(finishedGame!.status).toBe(GameStatus.Finished);

      const player1Final =
        finishedGame!.player1.userId === user1.id
          ? finishedGame!.player1
          : finishedGame!.player2;

      expect(player1Final!.score).toBe(0); // No bonus for 0 correct answers

      // Verify no active game exists
      const activeGame = await gameRepository
        .getActiveGameForUserOrFail(user1.id)
        .catch(() => null);
      expect(activeGame).toBeNull();
    });

    it('should throw error when trying to answer more than 5 questions', async () => {
      const { game, user1 } = await createActiveGame();

      // Answer all 5 questions
      for (let i = 0; i < 5; i++) {
        const question = await questionsRepository.getQuestionById(
          game.questions[i].questionId,
        );
        const correctAnswer = question!.correctAnswers.answers[0];
        await answerCommandHandler.execute(
          new AnswerQuestionCommand(user1.id, correctAnswer),
        );
      }

      // Try to answer 6th question
      const command = new AnswerQuestionCommand(user1.id, 'any answer');

      await expect(answerCommandHandler.execute(command)).rejects.toThrow(
        DomainException,
      );
      await expect(answerCommandHandler.execute(command)).rejects.toThrow(
        'All questions already answered',
      );
    });

    it('should throw error when user has no active game', async () => {
      const user = await createTestUser('noGameUser', 'nogame@example.com');
      await createPublishedQuestions();

      const command = new AnswerQuestionCommand(user.id, 'any answer');

      await expect(answerCommandHandler.execute(command)).rejects.toThrow(
        DomainException,
      );
      await expect(answerCommandHandler.execute(command)).rejects.toThrow(
        'No active game found for userId',
      );
    });

    // it('should handle case-sensitive correct answers', async () => {
    //   const { game, user1 } = await createActiveGame();
    //
    //   // First, answer first two questions to get to the third question
    //   for (let i = 0; i < 2; i++) {
    //     const question = await questionsRepository.getQuestionById(
    //       game.questions[i].questionId,
    //     );
    //     const correctAnswer = question!.correctAnswers.answers[0];
    //     await answerCommandHandler.execute(
    //       new AnswerQuestionCommand(user1.id, correctAnswer),
    //     );
    //   }
    //
    //   // Get the third question and find if it has case variations
    //   const thirdQuestion = await questionsRepository.getQuestionById(
    //     game.questions[2].questionId,
    //   );
    //
    //   // Use one of the correct answers for the third question
    //   const correctAnswer = thirdQuestion!.correctAnswers.answers[0];
    //   const command = new AnswerQuestionCommand(user1.id, correctAnswer);
    //   await answerCommandHandler.execute(command);
    //
    //   const updatedGame = await gameRepository.getActiveGameForUser(user1.id);
    //   const player1 =
    //     updatedGame.player1.userId === user1.id
    //       ? updatedGame.player1
    //       : updatedGame.player2;
    //
    //   expect(player1.answers[2].status).toBe(true);
    //   expect(player1.score).toBe(3);
    // });
    //
    // it('should maintain correct game state throughout multiple answers', async () => {
    //   const { game, user1, user2 } = await createActiveGame();
    //
    //   // Get the actual questions from the game and their correct answers
    //   const gameQuestions = await Promise.all(
    //     game.questions
    //       .slice(0, 3)
    //       .map((gq) => questionsRepository.getQuestionById(gq.questionId)),
    //   );
    //
    //   const answers = [
    //     {
    //       user: user1.id,
    //       answer: gameQuestions[0]!.correctAnswers.answers[0],
    //       expected: true,
    //     },
    //     { user: user2.id, answer: 'wrong', expected: false },
    //     {
    //       user: user1.id,
    //       answer: gameQuestions[1]!.correctAnswers.answers[0],
    //       expected: true,
    //     },
    //     { user: user2.id, answer: 'wrong', expected: false },
    //     {
    //       user: user1.id,
    //       answer: gameQuestions[2]!.correctAnswers.answers[0],
    //       expected: true,
    //     },
    //   ];
    //
    //   for (let i = 0; i < answers.length; i++) {
    //     const { user, answer, expected } = answers[i];
    //     await answerCommandHandler.execute(
    //       new AnswerQuestionCommand(user, answer),
    //     );
    //
    //     const currentGame = await gameRepository.getActiveGameForUser(user1.id);
    //     expect(currentGame.status).toBe(GameStatus.Active);
    //
    //     const player =
    //       currentGame.player1.userId === user
    //         ? currentGame.player1
    //         : currentGame.player2;
    //
    //     const expectedAnswerCount =
    //       user === user1.id ? Math.ceil((i + 1) / 2) : Math.floor((i + 1) / 2);
    //     expect(player.answers).toHaveLength(expectedAnswerCount);
    //
    //     if (player.answers.length > 0) {
    //       expect(player.answers[player.answers.length - 1].status).toBe(
    //         expected,
    //       );
    //     }
    //   }
    // });
  });
});
