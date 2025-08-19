import { IsUUID } from 'class-validator';
import { UUID } from 'crypto';
import { IsStringWithTrim } from 'src/core/decorators/validators/is-string-with-trim';
import { passwordConstraints } from '../../domain/user.schema';

export class ConfirmPasswordInputDto {
  @IsUUID()
  recoveryCode: UUID;

  @IsStringWithTrim(
    passwordConstraints.minLength,
    passwordConstraints.maxLength,
  )
  newPassword: string;
}
