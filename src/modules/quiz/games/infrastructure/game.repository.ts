import { InjectRepository } from '@nestjs/typeorm';
import { Game, GameStatus } from '../domain/game.schema';
import { Repository } from 'typeorm';
import { Player } from '../domain/player.schema';
import { PlayerAnswer } from '../domain/answer.schema';
import { GameQuestion } from '../domain/gameQuestions.schema';
import { UUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';

@Injectable()
export class GameRepository {
  constructor(
    @InjectRepository(Game) private readonly gameRepository: Repository<Game>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(PlayerAnswer)
    private readonly answerRepository: Repository<PlayerAnswer>,
    @InjectRepository(GameQuestion)
    private readonly gameQuestionRepository: Repository<GameQuestion>,
  ) {}

  async saveGame(game: Game): Promise<UUID> {
    const gameId = await this.gameRepository.save(game).then((game) => game.id);
    return gameId;
  }

  async savePlayer(player: Player): Promise<UUID> {
    const playerId = await this.playerRepository
      .save(player)
      .then((player) => player.id);
    return playerId;
  }

  async saveAnswer(answer: PlayerAnswer): Promise<UUID> {
    const answerId = await this.answerRepository
      .save(answer)
      .then((answer) => answer.id);
    return answerId;
  }

  async saveGameQuestion(gameQuestions: GameQuestion[]) {
    await this.gameQuestionRepository.save(gameQuestions);
  }

  async matchGame(): Promise<Game | null> {
    //in theory with current schema it is not possible to have more than 1 pending game in db
    //but i will keep the query just in case
    const pendingGame = await this.gameRepository.find({
      where: { status: GameStatus.Pending },
      order: { createdAt: 'ASC' },
      take: 1,
    });
    if (pendingGame.length === 0) {
      return null;
    } else {
      return pendingGame[0];
    }
  }

  async getActiveGameForUser(id: UUID): Promise<Game> {
    const game = await this.gameRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.player_1', 'player1')
      .leftJoinAndSelect('game.player_2', 'player2')
      .leftJoinAndSelect('player1.answers', 'player1ans')
      .leftJoinAndSelect('player2.answers', 'player2ans')
      .leftJoinAndSelect('game.questions', 'questions')
      .where('(player1."userId" = :id OR player2."userId" = :id)', { id })
      .andWhere('game.status = :status', { status: GameStatus.Active })
      .getOne();
    if (!game) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'No active game found for userId',
      });
    }
    return game;
  }

  async getPlayerByIdOrFail(id: UUID): Promise<Player> {
    const player = await this.playerRepository.findOne({
      where: { id },
      relations: { answers: true },
    });
    if (!player) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Not found player by id',
      });
    }
    return player;
  }
}
