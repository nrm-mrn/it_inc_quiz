import { IsBoolean } from 'class-validator';

export class SetPublishQuestionInputDto {
  @IsBoolean()
  published: boolean;
}
