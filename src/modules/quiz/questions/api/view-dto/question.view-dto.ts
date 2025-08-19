import { Question } from '../../domain/question.schema';

export class QuestionViewDto {
  id: string;
  body: string;
  correctAnswers: string[];
  published: boolean;
  createdAt: string;
  updatedAt: string;

  static mapToView(dto: Question): QuestionViewDto {
    return {
      id: dto.id,
      body: dto.body,
      correctAnswers: dto.correctAnswers.answers,
      published: dto.published,
      createdAt: dto.createdAt.toISOString(),
      updatedAt: dto.updatedAt.toISOString(),
    };
  }
}
