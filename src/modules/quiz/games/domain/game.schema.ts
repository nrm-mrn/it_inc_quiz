import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { Player } from './player.schema';
import { UUID } from 'crypto';
import { GameQuestion } from './gameQuestions.schema';
import { CreateGameDomainDto } from './dto/create-game-domain-dto';
import { ConnectSecondPlayer } from './dto/start-game-domain-dto';
import { BaseDbEntity } from 'src/core/entities/baseDbEntity';

export enum GameStatus {
  Pending = 'pending',
  Active = 'active',
  Finished = 'finished',
}

@Entity()
export class Game extends BaseDbEntity {
  @Column({
    type: 'varchar',
    collation: 'C',
  })
  status: GameStatus;

  @OneToOne(() => Player, (player) => player.game)
  @JoinColumn({ name: 'player1Id' })
  player1: Player;

  @Column({ type: 'uuid', nullable: false })
  player1Id: UUID;

  @OneToOne(() => Player, (player) => player.game)
  @JoinColumn({ name: 'player2Id' })
  player2: Player | null;

  @Column({ type: 'uuid', nullable: true })
  player2Id: UUID | null;

  @OneToMany(() => GameQuestion, (gameQuestion) => gameQuestion.game)
  questions: GameQuestion[];

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date;

  static Create(dto: CreateGameDomainDto): Game {
    const game = new this();
    game.status = GameStatus.Pending;
    game.player1Id = dto.firstPlayerId;
    game.player2Id = null;
    return game;
  }

  connectSecondPlayer(dto: ConnectSecondPlayer) {
    this.player2Id = dto.secondPlayerId;
  }

  attachQuestions(questions: GameQuestion[]) {
    this.questions = questions;
  }

  startGame() {
    this.status = GameStatus.Active;
    this.startedAt = new Date();
  }

  finishGame() {
    this.status = GameStatus.Finished;
    this.finishedAt = new Date();
  }
}
