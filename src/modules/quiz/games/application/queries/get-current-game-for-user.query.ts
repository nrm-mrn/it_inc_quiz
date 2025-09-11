import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UUID } from 'crypto';
import {
  GamePairViewDto,
  GamePlayerProgressViewModel,
  GameWithQuestionsModel,
} from '../../api/view-dto/game-pair.view-dto';
import { DataSource } from 'typeorm';
import { GameStatus } from '../../domain/game.schema';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';

export class GetCurrentGameForUser {
  constructor(public userId: UUID) {}
}

@QueryHandler(GetCurrentGameForUser)
export class GetCurrentGameForUserQueryHandler
  implements IQueryHandler<GetCurrentGameForUser, GamePairViewDto>
{
  constructor(private readonly dataSource: DataSource) {}

  async execute(query: GetCurrentGameForUser): Promise<GamePairViewDto> {
    const gameWithQuestionsRow = await this.dataSource.query<
      GameWithQuestionsModel[]
    >(
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
          json_agg(
            json_build_object(
              'id', gq."questionId",
              'body', q.body
            ) ORDER BY gq.order ASC
          ) FILTER (WHERE gq."questionId" IS NOT NULL),
          '[]'::json
        ) as questions
      FROM game AS g
      LEFT JOIN player AS p1 ON g."player1Id" = p1.id
      LEFT JOIN player AS p2 ON g."player2Id" = p2.id
      LEFT JOIN game_question AS gq ON g.id = gq."gameId"
      LEFT JOIN question AS q ON gq."questionId" = q.id
      WHERE
        (g.status = $1 OR g.status = $2) AND (p1."userId" = $3 OR p2."userId" = $3)
      GROUP BY
        g.id, g."player1Id", g."player2Id", g.status,
        g."startedAt", g."createdAt", g."finishedAt", g."deletedAt"
`,
      [GameStatus.Pending, GameStatus.Active, query.userId],
    );

    if (gameWithQuestionsRow.length === 0) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'No active games found',
      });
    }

    const gameWithQuestions = gameWithQuestionsRow[0];

    const firstPlayerProgress = await this.getPlayerProgressRows(
      gameWithQuestions.player1Id,
    );
    if (!firstPlayerProgress) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Encountered a game without first player progress',
      });
    }

    let secondPlayerProgress: GamePlayerProgressViewModel | null = null;
    if (gameWithQuestions.player2Id) {
      secondPlayerProgress = await this.getPlayerProgressRows(
        gameWithQuestions.player2Id,
      );
    }

    const gamePairView = GamePairViewDto.MapToGamePairView({
      game: gameWithQuestions,
      firstPlayerProgress,
      secondPlayerProgress,
    });

    return gamePairView;
  }

  async getPlayerProgressRows(
    playerId: UUID,
  ): Promise<GamePlayerProgressViewModel | null> {
    const secondPlayerProgressRows = await this.dataSource.query<
      { progress: GamePlayerProgressViewModel }[]
    >(
      /*sql*/ `
        SELECT
          json_build_object(
            'player', json_build_object(
              'id', p."userId",
              'login', u.login
            ),
            'answers', coalesce(
              json_agg(
                json_build_object(
                  'questionId', pa."questionId",
                  'answerStatus', CASE
                    WHEN pa.status = true THEN 'Correct'
                    ELSE 'Incorrect'
                  END,
                  'addedAt',
                  to_char(
                    pa."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                  )
                )
              ) FILTER (WHERE pa.id IS NOT null), '[]'::json
            ),
            'score', p.score
          ) AS progress
        FROM player AS p
        LEFT JOIN users AS u ON p."userId" = u.id
        LEFT JOIN player_answer AS pa ON p.id = pa."playerId"
        WHERE p.id = $1
        GROUP BY p.id, u.login, p.score
      `,
      [playerId],
    );
    return secondPlayerProgressRows[0].progress;
  }
}
