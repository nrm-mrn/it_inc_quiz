import { UUID } from 'crypto';
import { Game, GameStatus } from '../../domain/game.schema';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';

export enum AnswerStatuses {
  CORRECT = 'Correct',
  INCORRECT = 'Incorrect',
}

export enum GameStatuses {
  PENDING = 'PendingSecondPlayer',
  ACTIVE = 'Active',
  FINISHED = 'Finished',
}

export class AnswerViewModel {
  questionId: UUID;
  answerStatus: AnswerStatuses;
  addedAt: string;
}

export class GamePlayerProgressViewModel {
  answers: AnswerViewModel[];
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

export class GameWithQuestionsModel {
  id: UUID;
  player1Id: UUID;
  player2Id: UUID | null;
  status: GameStatus;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  deletedAt: Date | null;
  questions: QuestionViewModel[];
}

export class GamePairViewDto {
  id: UUID;
  firstPlayerProgress: GamePlayerProgressViewModel;
  secondPlayerProgress: GamePlayerProgressViewModel | null;
  questions: QuestionViewModel[] | null;
  status: GameStatuses;
  pairCreateDate: string;
  startGameDate: string | null;
  finishGameDate: string | null;

  static MapToGamePairView(dto: {
    game: GameWithQuestionsModel;
    firstPlayerProgress: GamePlayerProgressViewModel;
    secondPlayerProgress: GamePlayerProgressViewModel | null;
  }): GamePairViewDto {
    const view = new this();
    view.id = dto.game.id;
    view.firstPlayerProgress = dto.firstPlayerProgress;
    view.secondPlayerProgress = dto.secondPlayerProgress;
    view.questions =
      dto.game.questions.length === 0 ? null : dto.game.questions;
    switch (dto.game.status) {
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
    view.pairCreateDate = dto.game.createdAt.toISOString();
    view.startGameDate = dto.game.startedAt
      ? dto.game.startedAt.toISOString()
      : null;
    view.finishGameDate = dto.game.finishedAt
      ? dto.game.finishedAt.toISOString()
      : null;
    return view;
  }
}
