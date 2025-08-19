import { MailerService } from '@nestjs-modules/mailer';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EmailTemplates } from 'src/modules/notifications/email.templates';
import { UsersRepository } from '../../infrastructure/users.repository';
import { randomUUID, UUID } from 'crypto';
import { DateTime, Duration } from 'luxon';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import {
  DomainException,
  Extension,
} from 'src/core/exceptions/domain-exceptions';
import { UserAccountConfig } from '../../config/user-account.config';

export class ResendEmailConfirmationCommand {
  constructor(public email: string) {}
}

@CommandHandler(ResendEmailConfirmationCommand)
export class ResendEmailConfirmationHandler
  implements ICommandHandler<ResendEmailConfirmationCommand>
{
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly configService: UserAccountConfig,
    private readonly mailerService: MailerService,
    private readonly templateFactory: EmailTemplates,
  ) {}

  async execute(command: ResendEmailConfirmationCommand): Promise<any> {
    const user = await this.usersRepository.findUserByEmail(command.email);
    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'User with provided email do not exist',
        extensions: [
          new Extension('User with provided email do not exist', 'email'),
        ],
      });
    }
    const expiration = DateTime.utc()
      .plus(
        Duration.fromObject({
          minutes: this.configService.emailExpiration,
        }),
      )
      .toJSDate();

    const confirmationCode = user.genEmailConfirmation({
      code: randomUUID(),
      expiration,
      isConfirmed: false,
    });

    await this.usersRepository.saveUser(user);

    const emailTemplate = this.templateFactory.generateRegistrationEmail(
      this.configService.confirmationCodesDomain,
      confirmationCode as UUID,
    );
    this.mailerService
      .sendMail({
        to: user.email,
        subject: 'Bloggers platform registration',
        html: emailTemplate,
      })
      .catch((err) => console.error(`error sending email: ${err}`));
    return;
  }
}
