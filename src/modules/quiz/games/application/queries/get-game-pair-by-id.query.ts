import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UUID } from 'crypto';
import {
  GamePairViewDto,
  GamePlayerProgressViewModel,
  GameWithQuestionsModel,
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
      WHERE g.id = $1 AND (p1."userId" = $2 OR p2."userId" = $2)
      GROUP BY
        g.id, g."player1Id", g."player2Id", g.status,
        g."startedAt", g."createdAt", g."finishedAt", g."deletedAt"
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
      [playerId],
    );
    return secondPlayerProgressRows[0].progress;
  }
}
