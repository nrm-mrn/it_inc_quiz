import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetAllQuestionsQuery } from '../application/queries/get-all-questions.query';
import { GetQuestionQuery } from '../application/queries/get-question.query';
import { CreateQuestionCommand } from '../application/usecases/create-question.usecase';
import { DeleteQuestionCommand } from '../application/usecases/delete-question.usecase';
import { CreateQuestionInputDto } from './input-dto/create-question.input-dto';
import { GetQuestionsQueryParams } from './input-dto/get-all-questions-query-params.input-dto';
import { QuestionViewDto } from './view-dto/question.view-dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UUID } from 'crypto';
import { PaginatedViewDto } from 'src/core/dto/base.paginated.view-dto';
import { UuidValidationPipe } from 'src/core/pipes/uuid-validation-pipe.service';
import { BasicAuthGuard } from 'src/modules/user-accounts/guards/basic/basic-auth.guard';
import { UpdateQuestionInputDto } from './input-dto/update-question.input-dto';
import { UpdateQuestionCommand } from '../application/usecases/update-question.usecase';
import { SetPublishQuestionInputDto } from './input-dto/publish-unpublish-question.input-dto';
import { SetPublishCommand } from '../application/usecases/publish-unpublish-question.usecase';

@Controller('sa/quiz/questions')
@UseGuards(BasicAuthGuard)
export class QuestionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllQuestions(
    @Query() query: GetQuestionsQueryParams,
  ): Promise<PaginatedViewDto<QuestionViewDto[]>> {
    return this.queryBus.execute(new GetAllQuestionsQuery(query));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createQuestion(
    @Body() body: CreateQuestionInputDto,
  ): Promise<QuestionViewDto> {
    const { questionId } = await this.commandBus.execute<
      CreateQuestionCommand,
      { questionId: UUID }
    >(new CreateQuestionCommand(body.body, body.correctAnswers));
    const question = await this.queryBus.execute<
      GetQuestionQuery,
      QuestionViewDto
    >(new GetQuestionQuery(questionId));
    return question;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQuestion(@Param('id', UuidValidationPipe) id: UUID) {
    return this.commandBus.execute<DeleteQuestionCommand, void>(
      new DeleteQuestionCommand(id),
    );
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateQuestion(
    @Param('id', UuidValidationPipe) id: UUID,
    @Body() body: UpdateQuestionInputDto,
  ) {
    await this.commandBus.execute<UpdateQuestionCommand>(
      new UpdateQuestionCommand(id, body.body, body.correctAnswers),
    );
  }

  @Put(':id/publish')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setPublishStatus(
    @Param('id', UuidValidationPipe) id: UUID,
    @Body() body: SetPublishQuestionInputDto,
  ) {
    await this.commandBus.execute<SetPublishCommand>(
      new SetPublishCommand(id, body.published),
    );
  }
}
