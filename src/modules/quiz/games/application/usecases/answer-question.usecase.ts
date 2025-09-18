import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GameRepository } from '../../infrastructure/game.repository';
import { UUID } from 'crypto';
import { Player } from '../../domain/player.schema';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import { QuestionsRepository } from 'src/modules/quiz/questions/infrastructure/questions.repository';
import { PlayerAnswer } from '../../domain/answer.schema';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { DatabaseError } from 'pg';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GamesConfig } from '../../config/games.config';
import { Game } from '../../domain/game.schema';
import { FinishGameByTimeotJobDto } from '../processors/dto/finish-game-by-timeout.job-dto';

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
    private readonly dataSource: DataSource,
    private readonly gameRepository: GameRepository,
    private readonly questionRepository: QuestionsRepository,
    private readonly gamesConfig: GamesConfig,
    @InjectQueue('GamesToFinish')
    private readonly gamesQueue: Queue<FinishGameByTimeotJobDto>,
  ) {}

  async execute(command: AnswerQuestionCommand): Promise<UUID> {
    const retries = 3;
    let attempt = 0;
    while (true) {
      try {
        return await this.dataSource.transaction(
          'REPEATABLE READ',
          async (manager) => {
            const gameId = await this.gameRepository
              .getActiveGameForUserOrFail(command.userId, manager)
              .then((g) => g.id);
            const game = await this.gameRepository.getActiveGameById(
              gameId,
              manager,
            );
            const player =
              game.player1.userId == command.userId
                ? game.player1
                : (game.player2 as Player);
            const otherPlayer =
              game.player1.userId == command.userId
                ? (game.player2 as Player)
                : game.player1;

            const answer = await this.answerQuestion(
              player,
              game,
              command.answer,
              manager,
            );

            this.checkTimoutFinish(player, otherPlayer, gameId);

            this.checkNormalFinish(player, otherPlayer, game);

            const res = await Promise.all([
              this.gameRepository.saveAnswer(answer, manager),
              this.gameRepository.saveGame(game, manager),
              this.gameRepository.savePlayer(player, manager),
              this.gameRepository.savePlayer(otherPlayer, manager),
            ]);
            return res[0];
          },
        );
      } catch (error: any) {
        if (
          error instanceof QueryFailedError &&
          (error.driverError as DatabaseError).code === '40001' &&
          attempt < retries
        ) {
          attempt++;
          await new Promise((res) => setTimeout(res, 50 * attempt));
          continue;
        } else if (attempt >= retries) {
          throw new DomainException({
            code: DomainExceptionCode.InternalServerError,
            message: 'Too many transaction retries',
          });
        } else if (error instanceof DomainException) {
          throw error;
        } else {
          throw new DomainException({
            code: DomainExceptionCode.InternalServerError,
            message: 'unknown transaction error',
          });
        }
      }
    }
  }

  private async answerQuestion(
    player: Player,
    game: Game,
    answer: string,
    manager: EntityManager,
  ): Promise<PlayerAnswer> {
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
      manager,
    );
    let answerStatus: boolean;
    if (question.correctAnswers.answers.includes(answer)) {
      answerStatus = true;
      player.score += 1;
    } else {
      answerStatus = false;
    }
    const playerAnswer = PlayerAnswer.Create({
      playerId: player.id,
      questionId: question.id,
      status: answerStatus,
    });
    player.addAnswer(playerAnswer);
    return playerAnswer;
  }

  private checkTimoutFinish(player: Player, otherPlayer: Player, gameId: UUID) {
    if (player.answers.length === 5 && otherPlayer.answers.length !== 5) {
      void this.gamesQueue.add(
        'finish',
        { gameId: gameId },
        {
          delay: this.gamesConfig.timeout * 1000,
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
    }
  }

  private checkNormalFinish(player: Player, otherPlayer: Player, game: Game) {
    if (otherPlayer.answers.length === 5 && player.answers.length === 5) {
      if (otherPlayer.score > 0) {
        //bonus if finished first with at least one correct
        otherPlayer.score += 1;
      }
      game.finishGame();
      if (player.score > otherPlayer.score) {
        player.winner();
        otherPlayer.loser();
      } else if (player.score < otherPlayer.score) {
        player.loser();
        otherPlayer.winner();
      } else {
        player.draw();
        otherPlayer.draw();
      }
    }
  }
}
