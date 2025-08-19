import { IsStringWithTrim } from 'src/core/decorators/validators/is-string-with-trim';
import {
  loginConstraints,
  passwordConstraints,
} from '../../domain/user.schema';

export class UserLoginInputDto {
  @IsStringWithTrim(loginConstraints.minLength, 100)
  loginOrEmail: string;

  @IsStringWithTrim(
    passwordConstraints.minLength,
    passwordConstraints.maxLength,
  )
  password: string;
}
