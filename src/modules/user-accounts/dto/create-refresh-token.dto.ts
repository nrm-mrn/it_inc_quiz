import { UUID } from 'crypto';

export class CreateRefreshTokenDto {
  userId: UUID;
  deviceId: UUID;
  iat: number;
}
