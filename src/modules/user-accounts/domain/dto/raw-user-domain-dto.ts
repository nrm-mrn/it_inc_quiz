import { UUID } from 'crypto';

export class RawUser {
  id: UUID;
  login: string;
  email: string;
  passHash: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
