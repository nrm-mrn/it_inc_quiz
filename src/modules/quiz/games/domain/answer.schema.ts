import { BaseDbEntity } from 'src/core/entities/baseDbEntity';
import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { Player } from './player.schema';
import { randomUUID, UUID } from 'crypto';
import { Question } from '../../questions/domain/question.schema';
import { CreatePlayerAnswerDomainDto } from './dto/create-player-answer-domain-dto';

@Entity()
export class PlayerAnswer extends BaseDbEntity {
  @ManyToOne(() => Player)
  @JoinColumn({ name: 'playerId' })
  player: Relation<Player>;

  @Column({ type: 'uuid', nullable: false })
  playerId: UUID;

  @ManyToOne(() => Question)
  @JoinColumn({ name: 'questionId' })
  question: Relation<Question>;

  @Column({ type: 'uuid', nullable: false })
  questionId: UUID;

  @Column({ type: 'boolean' })
  status: boolean;

  static Create(dto: CreatePlayerAnswerDomainDto): PlayerAnswer {
    const answer = new this();
    answer.id = randomUUID();
    answer.playerId = dto.playerId;
    answer.questionId = dto.questionId;
    answer.status = dto.status;
    return answer;
  }
}
