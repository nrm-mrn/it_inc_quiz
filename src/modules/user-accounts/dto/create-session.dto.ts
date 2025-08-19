import { UUID } from 'crypto';

export class CreateSessionDto {
  deviceId: UUID;
  userId: UUID;
  iat: number;
  ip: string;
  title: string;
  expiration: Date;
}
