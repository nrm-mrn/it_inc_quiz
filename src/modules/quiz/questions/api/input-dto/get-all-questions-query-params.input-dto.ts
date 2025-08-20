import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BaseQueryParams } from 'src/core/dto/base.query-params.input-dto';

export enum QuestionsSortBy {
  CreatedAt = 'createdAt',
  Body = 'body',
}

export enum PublishedStatusQuery {
  All = 'all',
  Published = 'published',
  NotPublished = 'notPublished',
}

export class GetQuestionsQueryParams extends BaseQueryParams {
  @IsString()
  @IsOptional()
  bodySearchTerm: string | null = null;

  @IsEnum(PublishedStatusQuery)
  @IsOptional()
  publishedStatus: PublishedStatusQuery = PublishedStatusQuery.All;

  @IsEnum(QuestionsSortBy)
  @IsOptional()
  sortBy: QuestionsSortBy = QuestionsSortBy.CreatedAt;
}
