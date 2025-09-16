import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { PaginatedViewDto } from 'src/core/dto/base.paginated.view-dto';
import { GetTopUsersQueryParams } from '../../api/input-dto/get-top-users.input-dto';
import {
  RawTopUserDb,
  TopUserViewDto,
} from '../../api/view-dto/top-users.view-dto';

export class GetTopUsers {
  constructor(public query: GetTopUsersQueryParams) {}
}

@QueryHandler(GetTopUsers)
export class GetTopUsersQueryHandler
  implements IQueryHandler<GetTopUsers, PaginatedViewDto<TopUserViewDto[]>>
{
  constructor(private readonly dataSource: DataSource) {}

  async execute(
    query: GetTopUsers,
  ): Promise<PaginatedViewDto<TopUserViewDto[]>> {
    const rawQuery = /*sql*/ `
      SELECT
        SUM(p.score) as "sumScore",
        regexp_replace(to_char(AVG(p.score), 'FM999999.00'), '\.0+$', '') as "avgScores",
        COUNT(*) as "gamesCount",
        COUNT(*) FILTER (WHERE p.status = 'won') as "winsCount",
        COUNT(*) FILTER (WHERE p.status = 'lost') as "lossesCount",
        COUNT(*) FILTER (WHERE p.status = 'draw') as "drawsCount",
        json_build_object(
          'id', p."userId",
          'login', u.login
        ) as "player"
      FROM player p
      LEFT JOIN users u ON p."userId" = u.id
      GROUP BY p."userId", u.login
`;
    const q = this.dataSource
      .createQueryBuilder()
      .select('*')
      .from(`(${rawQuery})`, 'u')
      .offset(query.query.calculateSkip())
      .limit(query.query.pageSize);

    for (const [i, obj] of query.query.sortBy.entries()) {
      if (i == 0) {
        q.orderBy(`"${obj.field}"`, obj.order);
        continue;
      }
      q.addOrderBy(`"${obj.field}"`, obj.order);
    }

    const topUsers = await q.getRawMany<RawTopUserDb>();
    const { count } = (await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from(`(${rawQuery})`, 'u')
      .getRawOne<{ count: string }>()) as { count: string };
    console.log(topUsers);
    const topUsersView = topUsers.map((u) => TopUserViewDto.MapToView(u));

    return PaginatedViewDto.mapToView({
      items: topUsersView,
      page: query.query.pageNumber,
      size: query.query.pageSize,
      totalCount: Number(count),
    });
  }
}
