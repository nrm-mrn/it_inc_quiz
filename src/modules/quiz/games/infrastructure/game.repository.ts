import { InjectRepository } from '@nestjs/typeorm';
import { Game, GameStatus } from '../domain/game.schema';
import { EntityManager, Repository } from 'typeorm';
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

  private getGameRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(Game) : this.gameRepository;
  }

  private getPlayerRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(Player) : this.playerRepository;
  }

  private getAnswerRepo(manager?: EntityManager) {
    return manager
      ? manager.getRepository(PlayerAnswer)
      : this.answerRepository;
  }

  private getGameQuestionRepo(manager?: EntityManager) {
    return manager
      ? manager.getRepository(GameQuestion)
      : this.gameQuestionRepository;
  }

  async saveGame(game: Game, manager?: EntityManager): Promise<UUID> {
    const gameId = await this.getGameRepo(manager)
      .save(game)
      .then((game) => game.id);
    return gameId;
  }

  async savePlayer(player: Player, manager?: EntityManager): Promise<UUID> {
    const playerId = await this.getPlayerRepo(manager)
      .save(player)
      .then((player) => player.id);
    return playerId;
  }

  async saveAnswer(
    answer: PlayerAnswer,
    manager?: EntityManager,
  ): Promise<UUID> {
    const answerId = await this.getAnswerRepo(manager)
      .save(answer)
      .then((answer) => answer.id);
    return answerId;
  }

  async saveGameQuestion(
    gameQuestions: GameQuestion[],
    manager?: EntityManager,
  ) {
    await this.getGameQuestionRepo(manager).save(gameQuestions);
  }

  async matchGame(manager?: EntityManager): Promise<Game | null> {
    //in theory with current schema it is not possible to have more than 1 pending game in db
    //but i will keep the query just in case
    const pendingGame = await this.getGameRepo(manager).find({
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

  // async lockGameById(id: UUID, manager: EntityManager) {
  //   await this.getGameRepo(manager)
  //     .createQueryBuilder('game')
  //     .setLock('pessimistic_write', undefined, ['game'])
  //     .where('game.id = :id', { id })
  //     .getOne();
  // }

  async getActiveGameById(id: UUID, manager?: EntityManager): Promise<Game> {
    const q = this.getGameRepo(manager)
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.player1', 'player1')
      .leftJoinAndSelect('game.player2', 'player2')
      .leftJoinAndSelect('player1.answers', 'player1ans')
      .leftJoinAndSelect('player2.answers', 'player2ans')
      .leftJoinAndSelect('game.questions', 'questions')
      .where('(game.id = :id)', { id })
      .andWhere('game.status = :status', { status: GameStatus.Active })
      //added ordering just for safety because sometimes in testing I need to rely on order of the arrays
      .orderBy('questions.order', 'ASC')
      .addOrderBy('player1ans."createdAt"', 'ASC')
      .addOrderBy('player2ans."createdAt"', 'ASC');
    const game = await q.getOne();
    if (!game) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'No active game found for by id',
      });
    }
    return game;
  }

  async getPlayerByIdOrFail(
    id: UUID,
    manager?: EntityManager,
  ): Promise<Player> {
    const player = await this.getPlayerRepo(manager).findOne({
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

  async getActiveGameForUserOrFail(
    id: UUID,
    manager?: EntityManager,
  ): Promise<Game> {
    const q = this.getGameRepo(manager).createQueryBuilder('game');
    q.leftJoinAndSelect('game.player1', 'player1')
      .leftJoinAndSelect('game.player2', 'player2')
      .where('(player1."userId" = :id OR player2."userId" = :id)', { id })
      .andWhere('game.status = :status', { status: GameStatus.Active });
    //added ordering just for safety because sometimes in testing I need to rely on order of the arrays
    const game = await q.getOne();
    if (!game) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'No active game found for userId',
      });
    }
    return game;
  }

  async getGameById(id: UUID, manager?: EntityManager): Promise<Game | null> {
    return await this.getGameRepo(manager)
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.player1', 'player1')
      .leftJoinAndSelect('game.player2', 'player2')
      .leftJoinAndSelect('player1.answers', 'player1ans')
      .leftJoinAndSelect('player2.answers', 'player2ans')
      .leftJoinAndSelect('game.questions', 'questions')
      .where('game.id = :id', { id })
      .getOne();
  }
}
