import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { Game } from './game.schema';
import { UUID } from 'crypto';
import { Question } from '../../questions/domain/question.schema';
import { CreateGameQuestionDomainDto } from './dto/create-game-questions-domain-dto';

@Entity()
export class GameQuestion {
  @ManyToOne(() => Game)
  @JoinColumn({ name: 'gameId' })
  game: Relation<Game>;

  @PrimaryColumn()
  gameId: UUID;

  @ManyToOne(() => Question)
  @JoinColumn({ name: 'questionId' })
  question: Relation<Question>;

  @PrimaryColumn()
  questionId: UUID;

  @Column({ type: 'int' })
  order: number;

  static CreateGameQuestions(dto: CreateGameQuestionDomainDto): GameQuestion[] {
    const res: GameQuestion[] = [];
    for (const [i, qId] of dto.questionIds.entries()) {
      const q = new this();
      q.gameId = dto.gameId;
      q.questionId = qId;
      q.order = i;
      res.push(q);
    }
    return res;
  }
}
