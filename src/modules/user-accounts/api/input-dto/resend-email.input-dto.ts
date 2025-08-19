import { IsEmail } from 'class-validator';

export class ResendEmailConfirmationInputDto {
  @IsEmail()
  email: string;
}
