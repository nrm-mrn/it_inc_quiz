import { UUID } from 'crypto';
import { PlayerAnswer } from '../../domain/answer.schema';

export enum AnswerStatuses {
  CORRECT = 'Correct',
  INCORRECT = 'Incorrect',
}

export class AnswerViewDto {
  questionId: UUID;
  answerStatus: AnswerStatuses;
  addedAt: string;

  static MapToView(dto: PlayerAnswer): AnswerViewDto {
    const answer = new this();
    answer.questionId = dto.questionId;
    answer.answerStatus = dto.status
      ? AnswerStatuses.CORRECT
      : AnswerStatuses.INCORRECT;
    answer.addedAt = dto.createdAt.toISOString();
    return answer;
  }
}
