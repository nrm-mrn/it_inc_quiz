import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AnswerViewDto } from '../../api/view-dto/answer.view-dto';
import { InjectRepository } from '@nestjs/typeorm';
import { PlayerAnswer } from '../../domain/answer.schema';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';

export class GetAnswerQuery {
  constructor(public id: UUID) {}
}

@QueryHandler(GetAnswerQuery)
export class GetAnswerQueryHandler
  implements IQueryHandler<GetAnswerQuery, AnswerViewDto>
{
  constructor(
    @InjectRepository(PlayerAnswer)
    private readonly answerRepository: Repository<PlayerAnswer>,
  ) {}

  async execute(query: GetAnswerQuery): Promise<AnswerViewDto> {
    const answer = await this.answerRepository.findOneBy({ id: query.id });
    if (!answer) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Answer not found',
      });
    }
    return AnswerViewDto.MapToView(answer);
  }
}
