import { UUID } from 'crypto';

export class CreateEmailConfirmationDomainDto {
  expiration: Date | null;
  code: UUID | null;
  isConfirmed: boolean;
}
