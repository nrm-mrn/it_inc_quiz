import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { DeviceAuthSession } from './session.schema';
import { EmailConfirmation } from './emailConfirmation.schema';
import { PasswordRecovery } from './passwordRecovery.schema';
import { CreateUserDomainDto } from './dto/create-user-domain-dto';
import { BaseDbEntity } from 'src/core/entities/baseDbEntity';
import { DateTime, Duration } from 'luxon';
import { randomUUID, UUID } from 'crypto';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import {
  DomainException,
  Extension,
} from 'src/core/exceptions/domain-exceptions';
import { CreateSessionDomainDto } from './dto/create-session-domain-dto';
import { CreateUserByAdminDomainDto } from './dto/create-user-by-admin-domain-dto';
import { CreateEmailConfirmationDomainDto } from './dto/create-email-confirmation-domain-dto';

export const loginConstraints = {
  minLength: 3,
  maxLength: 10,
};

export const passwordConstraints = {
  minLength: 6,
  maxLength: 20,
};

@Entity('users')
export class User extends BaseDbEntity {
  @Column({
    collation: 'C',
  })
  login: string;

  @Column({
    type: 'varchar',
    unique: true,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 72,
  })
  passHash: string;

  @OneToMany(() => DeviceAuthSession, (session) => session.user, {
    cascade: true,
  })
  sessions: DeviceAuthSession[];

  @OneToOne(() => EmailConfirmation, (confirmation) => confirmation.user, {
    cascade: true,
  })
  emailConfirmation: EmailConfirmation;

  @OneToOne(() => PasswordRecovery, (recovery) => recovery.user, {
    cascade: true,
    nullable: true,
  })
  passwordRecovery: PasswordRecovery | null;

  static genConfirmationCode(): UUID {
    return randomUUID();
  }

  static createUser(dto: CreateUserDomainDto): User {
    const user = new this();
    user.login = dto.login;
    user.email = dto.email;
    user.passHash = dto.passwordHash;

    user.genEmailConfirmation({
      expiration: DateTime.utc().plus(dto.confirmationDuration).toJSDate(),
      code: User.genConfirmationCode(),
      isConfirmed: false,
    });

    return user;
  }

  static createUserByAdmin(dto: CreateUserByAdminDomainDto): User {
    const user = new this();
    user.login = dto.login;
    user.email = dto.email;
    user.passHash = dto.passwordHash;

    user.genEmailConfirmation({
      expiration: null,
      code: null,
      isConfirmed: true,
    });

    return user;
  }

  public genEmailConfirmation(
    dto: CreateEmailConfirmationDomainDto,
  ): UUID | null {
    if (this.emailConfirmation?.isConfirmed) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Email is already confirmed',
        extensions: [new Extension('Email is already confirmed', 'email')],
      });
    }
    if (!this.emailConfirmation) {
      const confirmation = EmailConfirmation.create({
        expiration: dto.expiration,
        code: dto.code,
        isConfirmed: dto.isConfirmed,
      });
      this.emailConfirmation = confirmation;
    } else {
      this.emailConfirmation.confirmationCode = dto.code;
      this.emailConfirmation.expirationDate = dto.expiration;
      this.emailConfirmation.isConfirmed = dto.isConfirmed;
    }
    return dto.code;
  }

  public genPasswordRecovery(duration: Duration): UUID {
    const code = User.genConfirmationCode();
    const expiration = DateTime.utc().plus(duration).toJSDate();
    if (!this.passwordRecovery) {
      const passRecovery = PasswordRecovery.create({
        code,
        expiration,
      });
      this.passwordRecovery = passRecovery;
    } else {
      this.passwordRecovery.confirmationCode = code;
      this.passwordRecovery.expirationDate = expiration;
    }
    return code;
  }

  public confirmPassword(newPassHash: string) {
    if (!this.passwordRecovery) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'No password confirmation object in entity',
      });
    }
    if (
      DateTime.fromJSDate(this.passwordRecovery.expirationDate) < DateTime.now()
    ) {
      throw new DomainException({
        code: DomainExceptionCode.PasswordRecoveryCodeExpired,
        message: 'Pass recovery code has expired',
        extensions: [
          new Extension('Pass recovery code has expired', 'recoveryCode'),
        ],
      });
    }
    this.passHash = newPassHash;
  }

  public confirmEmail() {
    if (!this.emailConfirmation || !this.emailConfirmation.expirationDate) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'No email confirmation object in entity',
      });
    }
    if (this.emailConfirmation.isConfirmed) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Email is already confirmed',
        extensions: [new Extension('Email is already confirmed', 'code')],
      });
    }
    if (
      DateTime.fromJSDate(this.emailConfirmation.expirationDate) <
      DateTime.now()
    ) {
      throw new DomainException({
        code: DomainExceptionCode.ConfirmationCodeExpired,
        message: 'Email confirmation code has expired',
        extensions: [new Extension('Email code has expired', 'code')],
      });
    }
    this.emailConfirmation.isConfirmed = true;
    this.emailConfirmation.confirmationCode = null;
    this.emailConfirmation.expirationDate = null;
  }

  public addSession(input: CreateSessionDomainDto) {
    if (!this.sessions) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Undefined sessions',
      });
    }
    const session = DeviceAuthSession.create(input);
    session.user = this;
    this.sessions.push(session);
  }

  public deleteSession(deviceId: UUID) {
    if (!this.sessions) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Undefined sessions',
      });
    }
    this.sessions = this.sessions.filter((s) => s.id !== deviceId);
  }

  public refreshSession(deviceId: UUID, iat: number, expiration: Date) {
    const idx = this.sessions.findIndex((s) => s.id === deviceId);
    this.sessions[idx].refresh({ iat, expiration });
  }

  public deleteOtherSessions(deviceId: UUID) {
    this.sessions = this.sessions.filter((s) => s.id === deviceId);
    return;
  }
}
