import { BaseDbEntity } from 'src/core/entities/baseDbEntity';
import { Column, Entity } from 'typeorm';
import { CreateQuestionDomainDto } from './dto/create-question-domain-dto';
import { UpdateQuestionDomainDto } from './dto/update-question-domain-dto';

@Entity()
export class Question extends BaseDbEntity {
  @Column({
    type: 'text',
    collation: 'C',
  })
  body: string;

  @Column({
    type: 'boolean',
  })
  published: boolean;

  @Column({
    type: 'jsonb',
  })
  correctAnswers: { answers: string[] };

  static create(dto: CreateQuestionDomainDto) {
    const question = new this();
    question.body = dto.body;
    question.published = false;
    question.correctAnswers = { answers: dto.answers };
    return question;
  }

  publish() {
    this.published = true;
  }

  unpublish() {
    this.published = false;
  }

  update(dto: UpdateQuestionDomainDto) {
    this.body = dto.body;
    this.published = false;
    this.correctAnswers = { answers: dto.answers };
  }
}
