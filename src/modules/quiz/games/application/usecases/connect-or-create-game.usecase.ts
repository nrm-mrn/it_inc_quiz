import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UUID } from 'crypto';
import { GameRepository } from '../../infrastructure/game.repository';
import { Player } from '../../domain/player.schema';
import { Game } from '../../domain/game.schema';
import { GameQuestion } from '../../domain/gameQuestions.schema';
import { QuestionsRepository } from 'src/modules/quiz/questions/infrastructure/questions.repository';
import { DataSource, QueryFailedError } from 'typeorm';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import { DatabaseError } from 'pg';

export class ConnectCommand {
  constructor(public userId: UUID) {}
}

@CommandHandler(ConnectCommand)
export class ConnectCommandHandler implements ICommandHandler<ConnectCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly gameRepository: GameRepository,
    private readonly questionRepository: QuestionsRepository,
  ) {}

  async execute(command: ConnectCommand): Promise<UUID> {
    const retries = 3;
    let attempt = 0;
    while (true) {
      try {
        return await this.dataSource.transaction(
          'SERIALIZABLE',
          async (manager) => {
            const player = Player.Create({
              userId: command.userId,
            });
            const playerId = await this.gameRepository.savePlayer(
              player,
              manager,
            );
            const pendingGame = await this.gameRepository.matchGame(manager);
            if (!pendingGame) {
              const game = Game.Create({
                firstPlayerId: playerId,
              });
              const gameId = await this.gameRepository.saveGame(game, manager);
              return gameId;
            }
            pendingGame.connectSecondPlayer({ secondPlayerId: playerId });
            const randomQuestionIds =
              await this.questionRepository.getRandomQuestionsForGame();
            const questions = GameQuestion.CreateGameQuestions({
              gameId: pendingGame.id,
              questionIds: randomQuestionIds,
            });
            pendingGame.attachQuestions(questions);
            pendingGame.startGame();
            await Promise.all([
              this.gameRepository.saveGame(pendingGame, manager),
              this.gameRepository.saveGameQuestion(questions, manager),
            ]);
            return pendingGame.id;
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
}
