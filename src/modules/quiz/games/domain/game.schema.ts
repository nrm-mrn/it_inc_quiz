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
  @Column({ type: 'enum', enum: GameStatus, enumName: 'game_status_enum' })
  status: GameStatus;

  @OneToOne(() => Player, (player) => player.game)
  @JoinColumn()
  player_1: Player;

  player_1Id: UUID;

  @OneToOne(() => Player, (player) => player.game)
  @JoinColumn()
  player_2: Player | null;

  player_2Id: UUID | null;

  @OneToMany(() => GameQuestion, (gameQuestion) => gameQuestion.game)
  questions: GameQuestion[];

  static Create(dto: CreateGameDomainDto): Game {
    const game = new this();
    game.status = GameStatus.Pending;
    game.player_1Id = dto.firstPlayerId;
    game.player_2Id = null;
    return game;
  }

  connectSecondPlayer(dto: ConnectSecondPlayer) {
    this.player_2Id = dto.secondPlayerId;
  }

  attachQuestions(questions: GameQuestion[]) {
    this.questions = questions;
  }

  startGame() {
    this.status = GameStatus.Active;
  }
}
