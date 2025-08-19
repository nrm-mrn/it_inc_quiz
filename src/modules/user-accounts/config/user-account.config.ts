import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsBoolean, IsNumber, IsString } from 'class-validator';
import { configValidationUtility } from 'src/setup/config-validation.utility';

@Injectable()
export class UserAccountConfig {
  @IsString({
    message: 'Set Env variable ADMIN_USERNAME',
  })
  adminUsername: string = this.configService.get('ADMIN_USERNAME');

  @IsString({
    message: 'Set Env variable ADMIN_PASSWORD',
  })
  adminPassword: string = this.configService.get('ADMIN_PASSWORD');

  @IsString({
    message: 'Set Env variable JWT_ACCESS_TOKEN_SECRET to any secure string',
  })
  jwtAccessSecret: string = this.configService.get('JWT_ACCESS_TOKEN_SECRET');

  @IsNumber(
    {},
    {
      message: 'Set JWT_EXP_TIME_IN_SECONDS env variable, example: 10',
    },
  )
  accessTokenDuration: number = Number(
    this.configService.get('JWT_EXP_TIME_IN_SECONDS'),
  );

  @IsString({
    message: 'Set Env variable JWT_REFRESH_TOKEN_SECRET to any secure string',
  })
  jwtRefreshSecret: string = this.configService.get('JWT_REFRESH_TOKEN_SECRET');

  @IsNumber(
    {},
    {
      message: 'Set REFRESHT_TIME_IN_SECONDS env variable, example: 20',
    },
  )
  refreshTokenDuration: number = Number(
    this.configService.get('REFRESHT_TIME_IN_SECONDS'),
  );

  @IsString({
    message:
      'Set env variable CONFIRMATION_CODES_DOMAIN to a valid domain name of the app, example: blogs-nest-itinc.vercel.app',
  })
  confirmationCodesDomain: string = this.configService.get(
    'CONFIRMATION_CODES_DOMAIN',
  );

  @IsNumber(
    {},
    {
      message:
        'Set PASS_RECOVERY_EXPIRATION_IN_MINUTES env variable, example: 10',
    },
  )
  passRecoveryExpiration: number = Number(
    this.configService.get('PASS_RECOVERY_EXPIRATION_IN_MINUTES'),
  );

  @IsNumber(
    {},
    {
      message:
        'Set EMAIL_RECOVERY_EXPIRATION_IN_MINUTES env variable, example: 10',
    },
  )
  emailExpiration: number = Number(
    this.configService.get('EMAIL_RECOVERY_EXPIRATION_IN_MINUTES'),
  );

  @IsBoolean({
    message:
      'Set env variable SECURE_REFRESHTOKEN_COOKIE to enable/disable secure cookie, example: true/false',
  })
  secureCookie = configValidationUtility.convertToBoolean(
    this.configService.get('SECURE_REFRESHTOKEN_COOKIE'),
  ) as boolean;

  constructor(private readonly configService: ConfigService<any, true>) {
    configValidationUtility.validateConfig(this);
  }
}
