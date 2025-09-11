import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsRepository } from '../../infrastructure/questions.repository';
import { Question } from '../../domain/question.schema';
import { configModule } from 'src/config-dynamic-module';
import { CoreConfig } from 'src/core/core.config';
import { CoreModule } from 'src/core/core.module';
import { TestingAPIService } from 'src/modules/testing/testingAPI.service';
import { TestingApiModule } from 'src/modules/testing/testingAPI.module';
import { UUID } from 'crypto';
import {
  GetAllQuestionsQuery,
  GetAllQuestionsQueryHandler,
} from '../queries/get-all-questions.query';
import { GetQuestionsQueryParams } from '../../api/input-dto/get-all-questions-query-params.input-dto';
import {
  CreateQuestionCommandHandler,
  CreateQuestionCommand,
} from '../usecases/create-question.usecase';
import { UpdateQuestionCommandHandler } from '../usecases/update-question.usecase';

describe('GetAllQuestionsQueryHandler Integration', () => {
  let app: TestingModule;
  let createCommandHandler: CreateQuestionCommandHandler;
  let queryHandler: GetAllQuestionsQueryHandler;
  let testingApiService: TestingAPIService;
  let questionIds: UUID[];

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
        GetAllQuestionsQueryHandler,
        QuestionsRepository,
        TestingAPIService,
      ],
    }).compile();

    createCommandHandler = app.get<CreateQuestionCommandHandler>(
      CreateQuestionCommandHandler,
    );
    queryHandler = app.get<GetAllQuestionsQueryHandler>(
      GetAllQuestionsQueryHandler,
    );
    testingApiService = app.get<TestingAPIService>(TestingAPIService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await testingApiService.clearDb();

    const questions = [
      {
        body: 'What is the capital of France?',
        answers: ['Paris', 'paris'],
      },
      {
        body: 'What is 2 + 2?',
        answers: ['4', 'four'],
      },
      {
        body: 'What is the largest planet in our solar system?',
        answers: ['Jupiter'],
      },
    ];

    questionIds = [];
    for (const question of questions) {
      const command = new CreateQuestionCommand(
        question.body,
        question.answers,
      );
      const result = await createCommandHandler.execute(command);
      questionIds.push(result.questionId);
    }
  });

  describe('execute', () => {
    it('should get paginated questions with correct form', async () => {
      // Arrange
      const queryParams = new GetQuestionsQueryParams();
      const query = new GetAllQuestionsQuery(queryParams);

      // Act
      const result = await queryHandler.execute(query);

      expect(result).toEqual({
        pagesCount: expect.any(Number),
        page: expect.any(Number),
        pageSize: expect.any(Number),
        totalCount: expect.any(Number),
        items: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            body: expect.any(String),
            correctAnswers: expect.arrayContaining([expect.any(String)]),
            published: expect.any(Boolean),
            createdAt: expect.any(String),
          }),
        ]),
      });

      expect(result.totalCount).toBe(3);
      expect(result.items).toHaveLength(3);

      const questionBodies = result.items.map((item) => item.body);
      expect(questionBodies).toContain('What is the capital of France?');
      expect(questionBodies).toContain('What is 2 + 2?');
      expect(questionBodies).toContain(
        'What is the largest planet in our solar system?',
      );

      // Verify all questions are unpublished by default
      result.items.forEach((item) => {
        expect(item.published).toBe(false);
        expect(questionIds).toContain(item.id);
      });
    });
  });
});
