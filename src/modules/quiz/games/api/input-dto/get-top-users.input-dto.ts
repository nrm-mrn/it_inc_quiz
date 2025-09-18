import { IsArray, IsNumber } from 'class-validator';
import { SortDirection } from 'src/core/dto/base.query-params.input-dto';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  DomainException,
  Extension,
} from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';

export enum TopUsersSortBy {
  SumScore = 'sumScore',
  AvgScores = 'avgScores',
  GamesCount = 'gamesCount',
  WinsCount = 'winsCount',
  LossesCount = 'lossesCount',
  DrawsCount = 'drawsCount',
  // Id = 'id',
  // Login = 'login',
}

export class GetTopUsersQueryParams {
  @Type(() => Number)
  @IsNumber()
  pageNumber: number = 1;

  @Type(() => Number)
  @IsNumber()
  pageSize: number = 10;

  @Transform(({ value }: TransformFnParams) => {
    const pairs = Array.isArray(value) ? value : [value];
    const res = pairs.map((v: string) => {
      const [field, order = SortDirection.DESC] = v.split(/\s+/);
      return { field, order: order.toUpperCase() };
    });
    return res;
  })
  @IsArray()
  sort: { field: TopUsersSortBy; order: SortDirection }[] = [
    { field: TopUsersSortBy.AvgScores, order: SortDirection.DESC },
    { field: TopUsersSortBy.SumScore, order: SortDirection.DESC },
  ];

  calculateSkip() {
    return (this.pageNumber - 1) * this.pageSize;
  }

  validateSorting() {
    this.sort.forEach((obj) => {
      if (!Object.values(TopUsersSortBy).includes(obj.field)) {
        throw new DomainException({
          code: DomainExceptionCode.ValidationError,
          message: `Unexpected sort field value: ${obj.field}`,
          extensions: [
            new Extension(`wrong sortBy value: ${obj.field}`, 'sortBy'),
          ],
        });
      }
      if (!Object.values(SortDirection).includes(obj.order)) {
        throw new DomainException({
          code: DomainExceptionCode.ValidationError,
          message: `Unexpected ordering value: ${obj.order}`,
          extensions: [
            new Extension(`wrong sortBy value: ${obj.order}`, 'sortBy'),
          ],
        });
      }
    });
  }
}
