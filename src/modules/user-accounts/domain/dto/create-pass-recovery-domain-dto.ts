import { UUID } from 'crypto';

export class CreatePassRecoveryDomainDto {
  code: UUID;
  expiration: Date;
}
