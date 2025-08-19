import { IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export class ConfirmEmailInputDto {
  @IsUUID()
  code: UUID;
}
