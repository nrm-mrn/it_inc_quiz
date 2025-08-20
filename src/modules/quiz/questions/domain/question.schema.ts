import { BaseDbEntity } from 'src/core/entities/baseDbEntity';
import { Column, Entity } from 'typeorm';
import { CreateQuestionDomainDto } from './dto/create-question-domain-dto';
import { UpdateQuestionDomainDto } from './dto/update-question-domain-dto';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';

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

  setPublish(input: boolean) {
    if (input === true) {
      if (this.correctAnswers.answers.length === 0) {
        throw new DomainException({
          code: DomainExceptionCode.ValidationError,
          message: 'Can not publish question with no answers',
        });
      }
    }
    this.published = input;
  }

  update(dto: UpdateQuestionDomainDto) {
    this.body = dto.body;
    this.published = false;
    this.correctAnswers = { answers: dto.answers };
  }
}
