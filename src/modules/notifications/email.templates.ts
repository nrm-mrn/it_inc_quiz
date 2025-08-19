import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailTemplates {
  generateRegistrationEmail(domain: string, code: string): string {
    return ` <h1>Thank for your registration</h1>
               <p>To finish registration please follow the link below:<br>
                  <a href='https://${domain}/confirm-email?code=${code}'>complete registration</a>
              </p>`;
  }

  generatePassRecoveryEmail(domain: string, code: string): string {
    return `<h1>Password recovery</h1>
       <p>To finish password recovery please follow the link below:
          <a href='https://${domain}/password-recovery?recoveryCode=${code}'>recovery password</a>
      </p>`;
  }
}
