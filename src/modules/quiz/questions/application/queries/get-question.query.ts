import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { QuestionViewDto } from '../../api/view-dto/question.view-dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Question } from '../../domain/question.schema';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';

export class GetQuestionQuery {
  constructor(public id: UUID) {}
}

@QueryHandler(GetQuestionQuery)
export class GetQuestionQueryHandler
  implements IQueryHandler<GetQuestionQuery, QuestionViewDto>
{
  constructor(
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
  ) {}

  async execute(query: GetQuestionQuery): Promise<QuestionViewDto> {
    const q = this.questionsRepository
      .createQueryBuilder('question')
      .where('question.id = :id', { id: query.id });
    const question = await q.getOne();
    if (!question) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Question not found by id',
      });
    }
    const questionView = QuestionViewDto.mapToView(question);
    return questionView;
  }
}
