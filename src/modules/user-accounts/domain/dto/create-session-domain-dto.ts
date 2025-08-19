import { UUID } from 'crypto';

export class CreateSessionDomainDto {
  deviceId: UUID;
  userId: UUID;
  iat: number;
  ip: string;
  title: string;
  expiration: Date;
}
