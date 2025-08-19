import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  async sendEmail(email: string, template: string): Promise<void> {
    await this.mailerService.sendMail({
      from: 'blogsmailerserv@mail.ru',
      to: email,
      subject: 'Email confirmation',
      html: template,
    });
  }
}
