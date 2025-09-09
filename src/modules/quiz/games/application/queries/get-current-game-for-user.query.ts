import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UUID } from 'crypto';
import {
  GamePairViewDto,
  GamePlayerProgressViewModel,
  GameWithQuestionsModel,
} from '../../api/view-dto/game-pair.view-dto';
import { DataSource } from 'typeorm';
import { Game, GameStatus } from '../../domain/game.schema';
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
            )
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

    //403 if userId is not participant in the provided gameId
    if (gameWithQuestionsRow.length === 0) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'User is not a participant in the provided game',
      });
    }
    const gameWithQuestions = gameWithQuestionsRow[0];

    const firstPlayerProgressRows = await this.dataSource.query<
      { progress: GamePlayerProgressViewModel }[]
    >(
      /*sql*/ `
        SELECT
          json_build_object(
            'player', json_build_object(
              'id', p.id,
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
                  'addedAt', pa."createdAt"
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
      [gameWithQuestions.player1Id],
    );
    const firstPlayerProgress = firstPlayerProgressRows[0].progress;

    let secondPlayerProgress: GamePlayerProgressViewModel | null = null;
    if (gameWithQuestions.player2Id) {
      const secondPlayerProgressRows = await this.dataSource.query<
        { progress: GamePlayerProgressViewModel }[]
      >(
        /*sql*/ `
        SELECT
          json_build_object(
            'player', json_build_object(
              'id', p.id,
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
                  'addedAt', pa."createdAt"
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
        [gameWithQuestions.player2Id],
      );
      secondPlayerProgress = secondPlayerProgressRows[0].progress;
    }

    const gamePairView = GamePairViewDto.MapToGamePairView({
      game: gameWithQuestions,
      firstPlayerProgress: firstPlayerProgress,
      secondPlayerProgress: secondPlayerProgress,
    });

    console.log(firstPlayerProgress.answers);

    return gamePairView;
  }
}
