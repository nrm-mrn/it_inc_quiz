import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsRepository } from '../../infrastructure/questions.repository';
import { Question } from '../../domain/question.schema';
import { configModule } from 'src/config-dynamic-module';
import { CoreConfig } from 'src/core/core.config';
import { CoreModule } from 'src/core/core.module';
import { TestingAPIService } from 'src/modules/testing/testingAPI.service';
import { TestingApiModule } from 'src/modules/testing/testingAPI.module';
import {
  CreateQuestionCommandHandler,
  CreateQuestionCommand,
} from '../usecases/create-question.usecase';

describe('CreateQuestionCommandHandler Integration', () => {
  let app: TestingModule;
  let commandHandler: CreateQuestionCommandHandler;
  let questionsRepository: QuestionsRepository;
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
        TypeOrmModule.forFeature([Question]),
      ],
      providers: [
        CreateQuestionCommandHandler,
        QuestionsRepository,
        TestingAPIService,
      ],
    }).compile();

    commandHandler = app.get<CreateQuestionCommandHandler>(
      CreateQuestionCommandHandler,
    );
    questionsRepository = app.get<QuestionsRepository>(QuestionsRepository);
    testingApiService = app.get<TestingAPIService>(TestingAPIService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await testingApiService.clearDb();
  });

  describe('execute', () => {
    it('should create a question and return questionId', async () => {
      const command = new CreateQuestionCommand(
        'What is the capital of France?',
        ['Paris', 'paris'],
      );
      const result = await commandHandler.execute(command);
      expect(result).toBeDefined();
      expect(result.questionId).toBeDefined();
      expect(typeof result.questionId).toBe('string');

      const savedQuestion = await questionsRepository.getQuestionById(
        result.questionId,
      );
      expect(savedQuestion).toBeDefined();
      expect(savedQuestion!.body).toBe('What is the capital of France?');
      expect(savedQuestion!.published).toBe(false);
      expect(savedQuestion!.correctAnswers.answers).toEqual(['Paris', 'paris']);
    });

    it('should create question with single answer', async () => {
      const command = new CreateQuestionCommand('What is 2 + 2?', ['4']);

      const result = await commandHandler.execute(command);

      const savedQuestion = await questionsRepository.getQuestionById(
        result.questionId,
      );
      expect(savedQuestion!.body).toBe('What is 2 + 2?');
      expect(savedQuestion!.correctAnswers.answers).toEqual(['4']);
      expect(savedQuestion!.published).toBe(false);
    });
  });
});
