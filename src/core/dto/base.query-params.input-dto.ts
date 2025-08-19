import { Type } from 'class-transformer';
import { IsEnum, IsNumber } from 'class-validator';
import { Upper } from '../decorators/transform/upper';

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class BaseQueryParams {
  @Type(() => Number)
  @IsNumber()
  pageNumber: number = 1;

  @Type(() => Number)
  @IsNumber()
  pageSize: number = 10;

  @Upper()
  @IsEnum(SortDirection)
  sortDirection: SortDirection = SortDirection.DESC;

  calculateSkip() {
    return (this.pageNumber - 1) * this.pageSize;
  }
}
