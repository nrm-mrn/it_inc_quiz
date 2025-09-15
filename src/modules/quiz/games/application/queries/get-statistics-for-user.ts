import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UUID } from 'crypto';
import { StatisticsForUserViewDto } from '../../api/view-dto/statistics-for-user';
import { DataSource } from 'typeorm';

export class GetStatisticsForUserQuery {
  constructor(public userId: UUID) {}
}

export class RawStatisticsDb {
  sumScore: string;
  avgScores: string;
  gamesCount: string;
  winsCount: string;
  lossesCount: string;
  drawsCount: string;
}

@QueryHandler(GetStatisticsForUserQuery)
export class GetStatisticsForUserQueryHandler
  implements IQueryHandler<GetStatisticsForUserQuery, StatisticsForUserViewDto>
{
  constructor(private readonly dataSource: DataSource) {}

  async execute(
    query: GetStatisticsForUserQuery,
  ): Promise<StatisticsForUserViewDto> {
    const rows = await this.dataSource.query<RawStatisticsDb[]>(
      /*sql*/ `
      SELECT 
        SUM(score) as "sumScore",
        regexp_replace(to_char(AVG(score), 'FM999999.00'), '\.0+$', '') as "avgScores",
        COUNT(*) as "gamesCount",
        COUNT(*) FILTER (WHERE status = 'won') as "winsCount",
        COUNT(*) FILTER (WHERE status = 'lost') as "lossesCount",
        COUNT(*) FILTER (WHERE status = 'draw') as "drawsCount"
      FROM player
      WHERE player."userId" = $1
      GROUP BY player."userId"
        `,
      [query.userId],
    );

    const stats = rows[0];

    if (!stats) {
      return StatisticsForUserViewDto.CreateZeroes();
    }

    return StatisticsForUserViewDto.MapToView(stats);
  }
}
