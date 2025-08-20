import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetQuestionsQueryParams,
  PublishedStatusQuery,
} from '../../api/input-dto/get-all-questions-query-params.input-dto';
import { PaginatedViewDto } from 'src/core/dto/base.paginated.view-dto';
import { QuestionViewDto } from '../../api/view-dto/question.view-dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Question } from '../../domain/question.schema';
import { ILike, Repository } from 'typeorm';

export class GetAllQuestionsQuery {
  constructor(public input: GetQuestionsQueryParams) {}
}

@QueryHandler(GetAllQuestionsQuery)
export class GetAllQuestionsQueryHandler
  implements
    IQueryHandler<GetAllQuestionsQuery, PaginatedViewDto<QuestionViewDto[]>>
{
  constructor(
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
  ) {}

  async execute(
    query: GetAllQuestionsQuery,
  ): Promise<PaginatedViewDto<QuestionViewDto[]>> {
    const q = this.questionsRepository.createQueryBuilder();

    q.select('*');
    if (query.input.publishedStatus !== PublishedStatusQuery.All) {
      switch (query.input.publishedStatus) {
        case PublishedStatusQuery.Published:
          q.where('q.published == true');
          break;
        case PublishedStatusQuery.NotPublished:
          q.where('q.published == false');
          break;
      }
      if (query.input.bodySearchTerm) {
        q.andWhere({ body: ILike(`%${query.input.bodySearchTerm}%`) });
      }
    }
    if (query.input.bodySearchTerm) {
      q.where({ body: ILike(`%${query.input.bodySearchTerm}%`) });
    }

    q.orderBy(`"${query.input.sortBy}"`, query.input.sortDirection);
    q.skip(query.input.calculateSkip());
    q.take(query.input.pageSize);

    const total = await q.getCount();
    const questions = await q.getMany();
    const questionsView = questions.map((question) =>
      QuestionViewDto.mapToView(question),
    );
    return PaginatedViewDto.mapToView({
      items: questionsView,
      page: query.input.pageNumber,
      size: query.input.pageSize,
      totalCount: total,
    });
  }
}
