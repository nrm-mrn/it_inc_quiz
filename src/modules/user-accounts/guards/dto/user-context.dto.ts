import { UUID } from 'crypto';

/**
 * user object for the jwt token and for transfer from the request object
 */
export class UserContextDto {
  userId: UUID;
}

export type Nullable<T> = { [P in keyof T]: T[P] | null };
