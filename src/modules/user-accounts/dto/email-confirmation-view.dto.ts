import { UUID } from 'crypto';

export class EmailConfirmationViewModel {
  confirmationCode: UUID;
  expirationDate: Date;
  isConfirmed: boolean;
}
