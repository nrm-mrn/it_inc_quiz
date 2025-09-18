import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNumber } from 'class-validator';
import { configValidationUtility } from 'src/setup/config-validation.utility';

@Injectable()
export class GamesConfig {
  @IsNumber(
    {},
    {
      message: 'Set Env variable GAMES_FINISH_TIMEOUT_IN_SECONDS, example: 10',
    },
  )
  timeout: number = Number(
    this.configService.get('GAMES_FINISH_TIMEOUT_IN_SECONDS'),
  );

  constructor(private readonly configService: ConfigService<any, true>) {
    configValidationUtility.validateConfig(this);
  }
}
