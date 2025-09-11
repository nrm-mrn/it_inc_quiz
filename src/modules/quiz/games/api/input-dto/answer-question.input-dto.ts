import { IsString } from 'class-validator';

export class AnswerQuestionInputDto {
  @IsString()
  answer: string;
}
