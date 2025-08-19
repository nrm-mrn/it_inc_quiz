import { Duration } from 'luxon';

export class CreateUserDomainDto {
  login: string;
  email: string;
  passwordHash: string;
  confirmationDuration: Duration;
}
