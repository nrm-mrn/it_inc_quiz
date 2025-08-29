import { BaseDbEntity } from 'src/core/entities/baseDbEntity';
import { Column, Entity, ManyToOne, Relation } from 'typeorm';
import { Player } from './player.schema';
import { UUID } from 'crypto';
import { Question } from '../../questions/domain/question.schema';
import { CreatePlayerAnswerDomainDto } from './dto/create-player-answer-domain-dto';

@Entity()
export class PlayerAnswer extends BaseDbEntity {
  @ManyToOne(() => Player)
  player: Relation<Player>;

  playerId: UUID;

  @ManyToOne(() => Question)
  question: Relation<Question>;

  questionId: UUID;

  @Column({ type: 'boolean' })
  status: boolean;

  static Create(dto: CreatePlayerAnswerDomainDto): PlayerAnswer {
    const answer = new this();
    answer.playerId = dto.playerId;
    answer.questionId = dto.questionId;
    answer.status = dto.status;
    return answer;
  }
}
