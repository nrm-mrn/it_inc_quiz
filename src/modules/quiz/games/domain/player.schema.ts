import { User } from 'src/modules/user-accounts/domain/user.schema';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  Relation,
} from 'typeorm';
import { Game } from './game.schema';
import { UUID } from 'crypto';
import { PlayerAnswer } from './answer.schema';
import { CreatePlayerDomainDto } from './dto/create-player-domain-dto';
import { BaseDbEntity } from 'src/core/entities/baseDbEntity';

export enum PlayerGameStatus {
  WINNER = 'won',
  LOSER = 'lost',
  DRAW = 'draw',
}

@Entity()
export class Player extends BaseDbEntity {
  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'varchar', collation: 'C', nullable: true })
  status: PlayerGameStatus | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: false })
  userId: UUID;

  @OneToOne(() => Game)
  game: Relation<Game>;

  @OneToMany(() => PlayerAnswer, (answer) => answer.player)
  answers: PlayerAnswer[];

  static Create(dto: CreatePlayerDomainDto): Player {
    const player = new this();
    player.score = 0;
    player.userId = dto.userId;
    return player;
  }

  addAnswer(answer: PlayerAnswer) {
    this.answers.push(answer);
  }

  winner() {
    this.status = PlayerGameStatus.WINNER;
  }

  loser() {
    this.status = PlayerGameStatus.LOSER;
  }

  draw() {
    this.status = PlayerGameStatus.DRAW;
  }
}
