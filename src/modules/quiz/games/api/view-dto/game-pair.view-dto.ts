import { UUID } from 'crypto';
import { GameStatus } from '../../domain/game.schema';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import { AnswerViewDto } from './answer.view-dto';

export enum GameStatuses {
  PENDING = 'PendingSecondPlayer',
  ACTIVE = 'Active',
  FINISHED = 'Finished',
}

export class GamePlayerProgressViewModel {
  answers: AnswerViewDto[];
  player: PlayerViewModel;
  score: number;
}

export class PlayerViewModel {
  id: UUID;
  login: string;
}

export class QuestionViewModel {
  id: UUID;
  body: string;
}

// export class GameWithQuestionsModel {
//   id: UUID;
//   player1Id: UUID;
//   player2Id: UUID | null;
//   status: GameStatus;
//   createdAt: Date;
//   startedAt: Date | null;
//   finishedAt: Date | null;
//   deletedAt: Date | null;
//   questions: QuestionViewModel[];
// }

export class RawGameDbView {
  id: UUID;
  firstPlayerProgress: GamePlayerProgressViewModel;
  secondPlayerProgress: GamePlayerProgressViewModel | null;
  questions: QuestionViewModel[];
  status: GameStatus;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export class GamePairViewDto {
  id: UUID;
  firstPlayerProgress: GamePlayerProgressViewModel;
  secondPlayerProgress: GamePlayerProgressViewModel | null;
  questions: QuestionViewModel[] | null;
  status: GameStatuses;
  pairCreatedDate: string;
  startGameDate: string | null;
  finishGameDate: string | null;

  static MapToGamePairView(game: RawGameDbView): GamePairViewDto {
    const view = new this();
    view.id = game.id;
    view.firstPlayerProgress = game.firstPlayerProgress;
    view.secondPlayerProgress = game.secondPlayerProgress;
    view.questions = game.questions.length === 0 ? null : game.questions;
    switch (game.status) {
      case GameStatus.Pending:
        view.status = GameStatuses.PENDING;
        break;
      case GameStatus.Active:
        view.status = GameStatuses.ACTIVE;
        break;
      case GameStatus.Finished:
        view.status = GameStatuses.FINISHED;
        break;
      default:
        throw new DomainException({
          code: DomainExceptionCode.InternalServerError,
          message: 'unknown game status recieved',
        });
    }
    view.pairCreatedDate = game.createdAt.toISOString();
    view.startGameDate = game.startedAt ? game.startedAt.toISOString() : null;
    view.finishGameDate = game.finishedAt
      ? game.finishedAt.toISOString()
      : null;
    return view;
  }
}
