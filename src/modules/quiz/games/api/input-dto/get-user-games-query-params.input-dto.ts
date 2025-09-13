import { IsEnum } from 'class-validator';
import { BaseQueryParams } from 'src/core/dto/base.query-params.input-dto';
import { MapQueryToEntity } from './decorators/map-query-to-entity';

export enum GamesSortBy {
  Status = 'status',
  PairCreated = 'createdAt',
  GameStarted = 'startedAt',
  GameFinished = 'finishedAt',
  Id = 'id',
}

export class GetUserGamesQueryParams extends BaseQueryParams {
  @MapQueryToEntity()
  @IsEnum(GamesSortBy)
  sortBy: GamesSortBy = GamesSortBy.PairCreated;
}
