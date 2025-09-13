import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UUID } from 'crypto';
import {
  GamePairViewDto,
  GamePlayerProgressViewModel,
  GameWithQuestionsModel,
  RawGameDbView,
} from '../../api/view-dto/game-pair.view-dto';
import { DataSource } from 'typeorm';
import { Game } from '../../domain/game.schema';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';

export class GetGameQuery {
  constructor(
    public gameId: UUID,
    public userId: UUID,
  ) {}
}

@QueryHandler(GetGameQuery)
export class GetGameQueryHandler
  implements IQueryHandler<GetGameQuery, GamePairViewDto>
{
  constructor(private readonly dataSource: DataSource) {}

  async execute(query: GetGameQuery): Promise<GamePairViewDto> {
    const game = await this.dataSource.query<Game[]>(
      /*sql*/ `
      SELECT * FROM game
      WHERE game.id = $1
    `,
      [query.gameId],
    );

    //404 if game not found
    if (game.length !== 1) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Game with provided id does not exist',
      });
    }

    const gameWithQuestionsRow = await this.dataSource.query<RawGameDbView[]>(
      /*sql*/ `
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
      WHERE g.id = $1 AND (p1."userId" = $2 OR p2."userId" = $2)
    `,
      [game[0].id, query.userId],
    );

    //403 if userId is not participant in the provided gameId
    if (gameWithQuestionsRow.length === 0) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'User is not a participant in the provided game',
      });
    }
    const gameWithQuestions = gameWithQuestionsRow[0];

    const gamePairView = GamePairViewDto.MapToGamePairView(gameWithQuestions);

    return gamePairView;
  }
}
