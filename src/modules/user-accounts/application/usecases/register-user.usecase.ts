import { MailerService } from '@nestjs-modules/mailer';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EmailTemplates } from 'src/modules/notifications/email.templates';
import { UsersService } from '../users.service';
import { Duration } from 'luxon';
import { UUID } from 'crypto';
import { UsersRepository } from '../../infrastructure/users.repository';
import { UserAccountConfig } from '../../config/user-account.config';
import { HashService } from '../passHash.service';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import {
  DomainException,
  Extension,
} from 'src/core/exceptions/domain-exceptions';
import { User } from '../../domain/user.schema';

export class RegisterUserCommand {
  constructor(
    public login: string,
    public password: string,
    public email: string,
  ) {}
}

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler
  implements ICommandHandler<RegisterUserCommand>
{
  constructor(
    private readonly usersService: UsersService,
    private readonly hashService: HashService,
    private readonly usersRepository: UsersRepository,
    private readonly mailerService: MailerService,
    private readonly templateFactory: EmailTemplates,
    private readonly configService: UserAccountConfig,
  ) {}

  async execute(command: RegisterUserCommand): Promise<void> {
    const user = await this.createUser(command);

    const email = this.templateFactory.generateRegistrationEmail(
      this.configService.confirmationCodesDomain,
      user.emailConfirmation.confirmationCode as UUID,
    );

    await this.usersRepository.saveUser(user);

    this.mailerService
      .sendMail({
        to: command.email,
        subject: 'Bloggers platform registration',
        html: email,
      })
      .catch((err) => console.error(`error sending email: ${err}`));
    return;
  }

  private async createUser(command: RegisterUserCommand): Promise<User> {
    const uniqueLogin = await this.usersService.isLoginUnique(command.login);
    if (!uniqueLogin) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Login already exists',
        extensions: [new Extension('Login already exist', 'login')],
      });
    }
    const uniqueEmail = await this.usersService.isEmailUnique(command.email);
    if (!uniqueEmail) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Email already exists',
        extensions: [new Extension('Email already exist', 'email')],
      });
    }
    const hash = await this.hashService.createHash(command.password);
    const expiration = Duration.fromObject({
      minutes: this.configService.emailExpiration,
    });
    const user = User.createUser({
      login: command.login,
      email: command.email,
      confirmationDuration: expiration,
      passwordHash: hash,
    });
    return user;
  }
}
