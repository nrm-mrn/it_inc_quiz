import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';
import { NotificationsConfig } from './notifications.config';
import { NotificationsConfigModule } from './notificationsConfig.module';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [NotificationsConfigModule],
      useFactory: (configService: NotificationsConfig) => {
        return {
          transport: `smtps://${configService.mailerLogin}:${configService.mailerPass}@${configService.mailerHost}`,
          defaults: {
            from: `"bloggers platform" <${configService.mailerLogin}>`,
          },
        };
      },
      inject: [NotificationsConfig],
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class NotificationsModule {}
