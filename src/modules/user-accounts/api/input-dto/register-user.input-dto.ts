import { IsString, IsEmail } from 'class-validator';
import { Trim } from 'src/core/decorators/transform/trim';
import { IsStringWithTrim } from 'src/core/decorators/validators/is-string-with-trim';
import {
  loginConstraints,
  passwordConstraints,
} from '../../domain/user.schema';

export class RegisterUserInputDto {
  @IsStringWithTrim(loginConstraints.minLength, loginConstraints.maxLength)
  login: string;

  @IsStringWithTrim(
    passwordConstraints.minLength,
    passwordConstraints.maxLength,
  )
  password: string;

  @Trim()
  @IsString()
  @IsEmail()
  email: string;
}
