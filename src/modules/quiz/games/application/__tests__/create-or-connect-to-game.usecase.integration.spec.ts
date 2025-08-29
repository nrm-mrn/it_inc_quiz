import { TestingModule, Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configModule } from 'src/config-dynamic-module';
import { CoreConfig } from 'src/core/core.config';
import { CoreModule } from 'src/core/core.module';
import {
  CreateQuestionCommandHandler,
  CreateQuestionCommand,
} from 'src/modules/quiz/questions/application/usecases/create-question.usecase';
import { Question } from 'src/modules/quiz/questions/domain/question.schema';
import { QuestionsRepository } from 'src/modules/quiz/questions/infrastructure/questions.repository';
import { TestingApiModule } from 'src/modules/testing/testingAPI.module';
import { TestingAPIService } from 'src/modules/testing/testingAPI.service';

describe('Create or connect to game command handler test', () => {
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
            logging: true,
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
