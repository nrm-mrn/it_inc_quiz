import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GameRepository } from '../../infrastructure/game.repository';
import { UUID } from 'crypto';
import { Player } from '../../domain/player.schema';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import { QuestionsRepository } from 'src/modules/quiz/questions/infrastructure/questions.repository';
import { PlayerAnswer } from '../../domain/answer.schema';
import { GameStatus } from '../../domain/game.schema';

export class AnswerQuestionCommand {
  constructor(
    public userId: UUID,
    public answer: string,
  ) {}
}

@CommandHandler(AnswerQuestionCommand)
export class AnswerQuestionCommandHandler
  implements ICommandHandler<AnswerQuestionCommand, UUID>
{
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly questionRepository: QuestionsRepository,
  ) {}

  async execute(command: AnswerQuestionCommand): Promise<UUID> {
    const game = await this.gameRepository.getActiveGameForUser(command.userId);
    const player =
      game.player1.userId == command.userId
        ? game.player1
        : (game.player2 as Player);
    const otherPlayer =
      game.player1.userId == command.userId
        ? (game.player2 as Player)
        : game.player1;
    const nextQuestionNumber = player.answers.length;
    if (nextQuestionNumber === 5) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'All questions already answered',
      });
    }
    const nextGameQuestion = game.questions.filter(
      (gq) => gq.order === nextQuestionNumber,
    )[0];
    const question = await this.questionRepository.getQuestionByIdOrFail(
      nextGameQuestion.questionId,
    );
    let answerStatus: boolean;
    if (question.correctAnswers.answers.includes(command.answer)) {
      answerStatus = true;
      player.score += 1;
    } else {
      answerStatus = false;
    }
    const answer = PlayerAnswer.Create({
      playerId: player.id,
      questionId: question.id,
      status: answerStatus,
    });
    //check if the game is finished
    if (otherPlayer.answers.length === 5 && player.answers.length === 4) {
      if (otherPlayer.score > 0) {
        //bonus if finished first with at least one correct
        otherPlayer.score += 1;
      }
      game.status = GameStatus.Finished;
    }
    const res = await Promise.all([
      this.gameRepository.saveAnswer(answer),
      this.gameRepository.saveGame(game),
      this.gameRepository.savePlayer(player),
      this.gameRepository.savePlayer(otherPlayer),
    ]);
    return res[0];
  }
}
