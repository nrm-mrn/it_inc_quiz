import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsString } from 'class-validator';
import { configValidationUtility } from 'src/setup/config-validation.utility';

@Injectable()
export class NotificationsConfig {
  @IsString({
    message: 'Set env variable EMAIL_HOST',
  })
  mailerHost: string = this.configService.get('EMAIL_HOST');

  @IsString({
    message: 'Set env variable EMAIL',
  })
  mailerLogin: string = this.configService.get('EMAIL');

  @IsString({
    message: 'Set env variable EMAIL_PASS',
  })
  mailerPass: string = this.configService.get('EMAIL_PASS');

  constructor(private readonly configService: ConfigService<any, true>) {
    configValidationUtility.validateConfig(this);
  }
}
