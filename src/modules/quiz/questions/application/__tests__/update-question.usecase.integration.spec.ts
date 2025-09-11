import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsRepository } from '../../infrastructure/questions.repository';
import { Question } from '../../domain/question.schema';
import { configModule } from 'src/config-dynamic-module';
import { CoreConfig } from 'src/core/core.config';
import { CoreModule } from 'src/core/core.module';
import { TestingAPIService } from 'src/modules/testing/testingAPI.service';
import { TestingApiModule } from 'src/modules/testing/testingAPI.module';
import { randomUUID, UUID } from 'crypto';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import {
  CreateQuestionCommandHandler,
  CreateQuestionCommand,
} from '../usecases/create-question.usecase';
import {
  UpdateQuestionCommandHandler,
  UpdateQuestionCommand,
} from '../usecases/update-question.usecase';

describe('UpdateQuestionCommandHandler Integration', () => {
  let app: TestingModule;
  let createCommandHandler: CreateQuestionCommandHandler;
  let commandHandler: UpdateQuestionCommandHandler;
  let questionsRepository: QuestionsRepository;
  let testingApiService: TestingAPIService;
  let questionId: UUID;

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
        TypeOrmModule.forFeature([Question]),
      ],
      providers: [
        CreateQuestionCommandHandler,
        UpdateQuestionCommandHandler,
        QuestionsRepository,
        TestingAPIService,
      ],
    }).compile();

    createCommandHandler = app.get<CreateQuestionCommandHandler>(
      CreateQuestionCommandHandler,
    );
    commandHandler = app.get<UpdateQuestionCommandHandler>(
      UpdateQuestionCommandHandler,
    );
    questionsRepository = app.get<QuestionsRepository>(QuestionsRepository);
    testingApiService = app.get<TestingAPIService>(TestingAPIService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await testingApiService.clearDb();
    const command = new CreateQuestionCommand(
      'What is the capital of France?',
      ['Paris', 'paris'],
    );
    questionId = await createCommandHandler
      .execute(command)
      .then((q) => q.questionId);
  });

  describe('execute', () => {
    it('should update a question', async () => {
      const command = new UpdateQuestionCommand(
        questionId,
        'What is the capital of GB?',
        ['London', 'london'],
      );
      await commandHandler.execute(command);

      const savedQuestion =
        await questionsRepository.getQuestionById(questionId);
      expect(savedQuestion).toBeDefined();
      expect(savedQuestion!.body).toBe('What is the capital of GB?');
      expect(savedQuestion!.published).toBe(false);
      expect(savedQuestion!.correctAnswers.answers).toEqual([
        'London',
        'london',
      ]);
    });

    it('should error when questionId does not exist', async () => {
      const command = new UpdateQuestionCommand(
        randomUUID(),
        'What is the capital of USA?',
        ['Washington', 'washington'],
      );

      await expect(commandHandler.execute(command)).rejects.toThrow(
        DomainException,
      );

      try {
        await commandHandler.execute(command);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).code).toBe(
          DomainExceptionCode.NotFound,
        );
      }
    });
  });
});
