import { UUID } from 'crypto';

export class ConfirmPasswordDto {
  code: UUID;
  password: string;
}
