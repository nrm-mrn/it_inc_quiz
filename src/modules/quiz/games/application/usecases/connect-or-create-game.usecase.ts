import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UUID } from 'crypto';
import { GameRepository } from '../../infrastructure/game.repository';
import { Player } from '../../domain/player.schema';
import { Game } from '../../domain/game.schema';
import { GameQuestion } from '../../domain/gameQuestions.schema';
import { QuestionsRepository } from 'src/modules/quiz/questions/infrastructure/questions.repository';

export class ConnectCommand {
  constructor(public userId: UUID) {}
}

@CommandHandler(ConnectCommand)
export class ConnectCommandHandler implements ICommandHandler<ConnectCommand> {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly questionRepository: QuestionsRepository,
  ) {}

  async execute(command: ConnectCommand): Promise<UUID> {
    const player = Player.Create({
      userId: command.userId,
    });
    const playerId = await this.gameRepository.savePlayer(player);
    const pendingGame = await this.gameRepository.matchGame();
    if (!pendingGame) {
      const game = Game.Create({
        firstPlayerId: playerId,
      });
      const gameId = await this.gameRepository.saveGame(game);
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
      this.gameRepository.saveGame(pendingGame),
      this.gameRepository.saveGameQuestion(questions),
    ]);
    return pendingGame.id;
  }
}
