import { IsArray, IsString } from 'class-validator';
import { IsStringWithTrim } from 'src/core/decorators/validators/is-string-with-trim';

export class CreateQuestionInputDto {
  @IsStringWithTrim(10, 500)
  body: string;

  @IsArray()
  @IsString({ each: true })
  correctAnswers: string[];
}
