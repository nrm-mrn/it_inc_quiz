import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UUID } from 'crypto';
import {
  GamePairViewDto,
  GamePlayerProgressViewModel,
  GameWithQuestionsModel,
  RawGameDbView,
} from '../../api/view-dto/game-pair.view-dto';
import { DataSource } from 'typeorm';
import { GameStatus } from '../../domain/game.schema';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import { PaginatedViewDto } from 'src/core/dto/base.paginated.view-dto';
import {
  GamesSortBy,
  GetUserGamesQueryParams,
} from '../../api/input-dto/get-user-games-query-params.input-dto';
import { SortDirection } from 'src/core/dto/base.query-params.input-dto';

export class GetUserGames {
  constructor(
    public userId: UUID,
    public query: GetUserGamesQueryParams,
  ) {}
}

@QueryHandler(GetUserGames)
export class GetUserGamesQueryHandler
  implements IQueryHandler<GetUserGames, PaginatedViewDto<GamePairViewDto[]>>
{
  constructor(private readonly dataSource: DataSource) {}

  async execute(
    query: GetUserGames,
  ): Promise<PaginatedViewDto<GamePairViewDto[]>> {
    const rawQuery = /*sql*/ `
      SELECT
        g.id,
        g."player1Id",
        g."player2Id",
        g.status,
        g."startedAt",
        g."createdAt",
        g."finishedAt",
        g."deletedAt",
        coalesce(
          (
            SELECT
              json_agg(
                json_build_object(
                  'id', gq."questionId",
                  'body', q.body
                ) ORDER BY gq.order ASC
              )
            FROM game_question AS gq
            INNER JOIN question AS q ON gq."questionId" = q.id
            WHERE gq."gameId" = g.id
          ),
          '[]'::json
        ) as questions,
        json_build_object(
          'player', json_build_object(
            'id', p1."userId",
            'login', u1.login
          ),
          'answers', coalesce((
            SELECT
              json_agg(
                json_build_object(
                  'questionId', pa."questionId",
                  'answerStatus',
                  CASE WHEN pa.status = TRUE THEN 'Correct' ELSE 'Incorrect' END,
                  'addedAt', to_char(
                    pa."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                  )
                ) ORDER BY pa."createdAt"
              )
            FROM player_answer AS pa
            WHERE pa."playerId" = p1.id
          ), '[]'::json),
          'score', p1.score
        ) AS "firstPlayerProgress",
        CASE
          WHEN g."player2Id" IS NOT NULL
            THEN
              json_build_object(
                'player', json_build_object(
                  'id', p2."userId",
                  'login', u2.login
                ),
                'answers', coalesce((
                  SELECT
                    json_agg(
                      json_build_object(
                        'questionId', pa."questionId",
                        'answerStatus',
                        CASE
                          WHEN pa.status = TRUE THEN 'Correct' ELSE 'Incorrect'
                        END,
                        'addedAt',
                        to_char(
                          pa."createdAt" AT TIME ZONE 'UTC',
                          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                        )
                      ) ORDER BY pa."createdAt"
                    )
                  FROM player_answer AS pa
                  WHERE pa."playerId" = p2.id
                ), '[]'::json),
                'score', p2.score
              )
        END AS "secondPlayerProgress"
      FROM game AS g
      LEFT JOIN player AS p1 ON g."player1Id" = p1.id
      LEFT JOIN player AS p2 ON g."player2Id" = p2.id
      LEFT JOIN users AS u1 on p1."userId" = u1.id
      LEFT JOIN users AS u2 on p2."userId" = u2.id
      WHERE (p1."userId" = :userId OR p2."userId" = :userId)
`;
    const q = this.dataSource
      .createQueryBuilder()
      .select('*')
      .from(`(${rawQuery})`, 'g')
      .setParameters({ userId: query.userId })
      .orderBy(`g."${query.query.sortBy}"`, query.query.sortDirection)
      .offset(query.query.calculateSkip())
      .limit(query.query.pageSize);

    if (query.query.sortBy !== GamesSortBy.PairCreated) {
      q.addOrderBy(`g."${GamesSortBy.PairCreated}"`, SortDirection.DESC);
    }
    const games = await q.getRawMany<RawGameDbView>();
    const { count } = (await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from(`(${rawQuery})`, 'g')
      .setParameters({ userId: query.userId })
      .getRawOne<{ count: string }>()) as { count: string };
    const gamesView = games.map((g) => GamePairViewDto.MapToGamePairView(g));

    return PaginatedViewDto.mapToView({
      items: gamesView,
      page: query.query.pageNumber,
      size: query.query.pageSize,
      totalCount: Number(count),
    });
  }
}
