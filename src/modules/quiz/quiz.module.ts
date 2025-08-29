import { Module } from '@nestjs/common';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';
import { QuestionsController } from './questions/api/questions.controller';
import { CreateQuestionCommandHandler } from './questions/application/usecases/create-question.usecase';
import { UpdateQuestionCommandHandler } from './questions/application/usecases/update-question.usecase';
import { DeleteQuestionCommandHandler } from './questions/application/usecases/delete-question.usecase';
import { SetPublishQuestionCommandHandler } from './questions/application/usecases/publish-unpublish-question.usecase';
import { GetQuestionQueryHandler } from './questions/application/queries/get-question.query';
import { GetAllQuestionsQueryHandler } from './questions/application/queries/get-all-questions.query';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './questions/domain/question.schema';
import { QuestionsRepository } from './questions/infrastructure/questions.repository';

const usecases = [
  CreateQuestionCommandHandler,
  UpdateQuestionCommandHandler,
  DeleteQuestionCommandHandler,
  SetPublishQuestionCommandHandler,
];

const queries = [GetQuestionQueryHandler, GetAllQuestionsQueryHandler];

@Module({
  imports: [UserAccountsModule, TypeOrmModule.forFeature([Question])],
  controllers: [QuestionsController],
  providers: [...usecases, ...queries, QuestionsRepository],
})
export class QuizModule {}
