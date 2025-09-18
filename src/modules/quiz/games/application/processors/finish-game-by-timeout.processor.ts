import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { FinishGameByTimeotJobDto } from './dto/finish-game-by-timeout.job-dto';
import { GameRepository } from '../../infrastructure/game.repository';
import { DataSource, QueryFailedError } from 'typeorm';
import { DatabaseError } from 'pg';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { GameStatus } from '../../domain/game.schema';
import { Logger } from '@nestjs/common';
import { Player } from '../../domain/player.schema';

@Processor('GamesToFinish')
export class FinishGameProcessor extends WorkerHost {
  private readonly logger = new Logger(FinishGameProcessor.name);
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly dataSource: DataSource,
  ) {
    super();
  }
  async process(job: Job<FinishGameByTimeotJobDto>): Promise<any> {
    console.log('processor start');
    const retries = 3;
    let attempt = 0;
    while (true) {
      try {
        return await this.dataSource.transaction(
          'REPEATABLE READ',
          async (manager) => {
            const game = await this.gameRepository.getGameById(
              job.data.gameId,
              manager,
            );
            if (!game) {
              throw new DomainException({
                code: DomainExceptionCode.InternalServerError,
                message: `Not found game with id ${job.data.gameId} to finish in the job`,
              });
            }
            if (game.status === GameStatus.Active) {
              if (!game.player2) {
                throw new DomainException({
                  code: DomainExceptionCode.InternalServerError,
                  message: `No second player in the active game ${job.data.gameId}`,
                });
              }
              //check if bonus point should be added
              let finishedFirst: Player;
              if (game.player1.answers > game.player2.answers) {
                finishedFirst = game.player1;
              } else {
                finishedFirst = game.player2;
              }
              const hasCorrect = finishedFirst.answers.some(
                (a) => a.status === true,
              );
              if (hasCorrect) {
                finishedFirst.score += 1;
              }
              if (game.player1.score > game.player2.score) {
                game.player1.winner();
                game.player2.loser();
              } else if (game.player1.score < game.player2.score) {
                game.player1.loser();
                game.player2.winner();
              } else {
                game.player1.draw();
                game.player2.draw();
              }
              game.finishGame();
              await this.gameRepository.saveGame(game, manager);
            }
            return;
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
          this.logger.error('Too many transaction retries');
          throw new DomainException({
            code: DomainExceptionCode.InternalServerError,
            message: 'Too many transaction retries',
          });
        } else if (error instanceof DomainException) {
          this.logger.error(error.message);
          throw error;
        } else {
          this.logger.error('unknown transaction error');
          throw new DomainException({
            code: DomainExceptionCode.InternalServerError,
            message: 'unknown transaction error',
          });
        }
      }
    }
  }
}
