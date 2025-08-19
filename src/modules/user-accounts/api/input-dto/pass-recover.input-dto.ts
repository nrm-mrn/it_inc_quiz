import { IsEmail } from 'class-validator';

export class PassRecoverInputDto {
  @IsEmail()
  email: string;
}
