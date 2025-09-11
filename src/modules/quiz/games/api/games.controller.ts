import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from 'src/modules/user-accounts/guards/bearer/jwt-auth.guard';
import { ExtractUserFromRequest } from 'src/modules/user-accounts/guards/decorators/extract-user-from-request.decorator';
import { UserContextDto } from 'src/modules/user-accounts/guards/dto/user-context.dto';
import { GamePairViewDto } from './view-dto/game-pair.view-dto';
import { GetCurrentGameForUser } from '../application/queries/get-current-game-for-user.query';
import { UuidValidationPipe } from 'src/core/pipes/uuid-validation-pipe.service';
import { UUID } from 'crypto';
import { GetGameQuery } from '../application/queries/get-game-pair-by-id.query';
import { ConnectCommand } from '../application/usecases/connect-or-create-game.usecase';
import { AnswerQuestionInputDto } from './input-dto/answer-question.input-dto';
import { AnswerViewDto } from './view-dto/answer.view-dto';
import { AnswerQuestionCommand } from '../application/usecases/answer-question.usecase';
import { GetAnswerQuery } from '../application/queries/get-answer.query';

@Controller('pair-game-quiz/pairs/')
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('/my-current')
  @HttpCode(HttpStatus.OK)
  async getCurrentGame(
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<GamePairViewDto> {
    return this.queryBus.execute<GetCurrentGameForUser, GamePairViewDto>(
      new GetCurrentGameForUser(user.userId),
    );
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async getGame(
    @Param('id', UuidValidationPipe) id: UUID,
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<GamePairViewDto> {
    return this.queryBus.execute<GetGameQuery, GamePairViewDto>(
      new GetGameQuery(id, user.userId),
    );
  }

  @Post('/connection')
  @HttpCode(HttpStatus.OK)
  async connect(
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<GamePairViewDto> {
    const gameId = await this.commandBus.execute<ConnectCommand, UUID>(
      new ConnectCommand(user.userId),
    );
    return this.queryBus.execute(new GetGameQuery(gameId, user.userId));
  }

  @Post('/answers')
  @HttpCode(HttpStatus.OK)
  async answerQuestion(
    @Body() body: AnswerQuestionInputDto,
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<AnswerViewDto> {
    const answerId = await this.commandBus.execute<AnswerQuestionCommand, UUID>(
      new AnswerQuestionCommand(user.userId, body.answer),
    );
    return this.queryBus.execute<GetAnswerQuery, AnswerViewDto>(
      new GetAnswerQuery(answerId),
    );
  }
}
