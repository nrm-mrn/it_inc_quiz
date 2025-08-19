import { MailerService } from '@nestjs-modules/mailer';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EmailTemplates } from 'src/modules/notifications/email.templates';
import { UsersRepository } from '../../infrastructure/users.repository';
import { DateTime, Duration } from 'luxon';
import { UserAccountConfig } from '../../config/user-account.config';

export class RecoverPasswordCommand {
  constructor(public email: string) {}
}

@CommandHandler(RecoverPasswordCommand)
export class RecoverPasswordHandler
  implements ICommandHandler<RecoverPasswordCommand>
{
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly mailerService: MailerService,
    private readonly templateFactory: EmailTemplates,
    private readonly configService: UserAccountConfig,
  ) {}

  async execute(command: RecoverPasswordCommand): Promise<any> {
    const user = await this.usersRepository.findUserByEmail(command.email);
    if (!user) {
      return null;
    }
    const confirmationCode = user.genPasswordRecovery(
      Duration.fromObject({
        minutes: this.configService.passRecoveryExpiration,
      }),
    );
    await this.usersRepository.saveUser(user);

    const emailTemplate = this.templateFactory.generatePassRecoveryEmail(
      this.configService.confirmationCodesDomain,
      confirmationCode,
    );

    this.mailerService
      .sendMail({
        to: command.email,
        subject: 'Blogs service password recovery request',
        html: emailTemplate,
      })
      .catch((err) => console.error(`Error sending email: ${err}`));
    return;
  }
}
