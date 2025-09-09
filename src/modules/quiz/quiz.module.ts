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
import { GetGameQueryHandler } from './games/application/queries/get-game-pair-by-id.query';
import { PlayerAnswer } from './games/domain/answer.schema';
import { Game } from './games/domain/game.schema';
import { GameQuestion } from './games/domain/gameQuestions.schema';
import { Player } from './games/domain/player.schema';
import { GetCurrentGameForUserQueryHandler } from './games/application/queries/get-current-game-for-user.query';

const usecases = [
  CreateQuestionCommandHandler,
  UpdateQuestionCommandHandler,
  DeleteQuestionCommandHandler,
  SetPublishQuestionCommandHandler,
];

const queries = [
  GetQuestionQueryHandler,
  GetAllQuestionsQueryHandler,
  GetGameQueryHandler,
  GetCurrentGameForUserQueryHandler,
];

@Module({
  imports: [
    UserAccountsModule,
    TypeOrmModule.forFeature([
      Question,
      PlayerAnswer,
      Game,
      GameQuestion,
      Player,
    ]),
  ],
  controllers: [QuestionsController],
  providers: [...usecases, ...queries, QuestionsRepository],
})
export class QuizModule {}
