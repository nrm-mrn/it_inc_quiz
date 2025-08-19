import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsBoolean, IsEnum, IsNumber, IsString } from 'class-validator';
import { configValidationUtility } from 'src/setup/config-validation.utility';

export enum Environments {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TESTING = 'testing',
}

@Injectable()
export class CoreConfig {
  @IsNumber(
    {},
    {
      message: 'Set env variable PORT',
    },
  )
  port: number = Number(this.configService.get('PORT'));

  @IsEnum(Environments, {
    message:
      'Set correct NODE_ENV value, available values: ' +
      configValidationUtility.getEnumValues(Environments).join(', '),
  })
  nodeEnv: string = this.configService.get('NODE_ENV');

  @IsString({
    message: 'Set env variable DB_HOST to a valid db host',
  })
  dbHost: string = this.configService.get('DB_HOST');

  @IsString({
    message: 'Set env variable DB_USER to a valid username for db connection',
  })
  dbUser: string = this.configService.get('DB_USER');

  @IsString({
    message: 'Set Env variable DB_NAME to a valid app db name',
  })
  dbName: string = this.configService.get('DB_NAME');

  @IsString({
    message: 'Set env variable DB_PASS to a valid password for db connection',
  })
  dbPass: string = this.configService.get('DB_PASS');

  @IsNumber(
    {},
    {
      message: 'Set env variable DB_PORT to a port of running postgres',
    },
  )
  dbPort: number = Number(this.configService.get('DB_PORT'));

  @IsBoolean({
    message:
      'Set env variable IS_SWAGGER_ENABLED to enable/disable swagger, example: true/false',
  })
  isSwaggerEnabled = configValidationUtility.convertToBoolean(
    this.configService.get('IS_SWAGGER_ENABLED'),
  ) as boolean;

  @IsBoolean({
    message:
      'Set env variable VERBOSE_ERRORS to enable/disable detailed error messages returned to frontend',
  })
  verboseErrors = configValidationUtility.convertToBoolean(
    this.configService.get('VERBOSE_ERRORS'),
  ) as boolean;

  @IsNumber(
    {},
    {
      message:
        'Set env variable THROTTLER_REQUESTS_TTL_IN_MS to limit number of allowed requests in a given timeframe',
    },
  )
  requestsTTL: number = Number(
    this.configService.get('THROTTLER_REQUESTS_TTL_IN_MS'),
  );

  @IsNumber(
    {},
    {
      message:
        'Set env variable THROTTLER_REQUESTS_LIMIT to limit number of allowed requests in a given timeframe',
    },
  )
  requestsLimit: number = Number(
    this.configService.get('THROTTLER_REQUESTS_LIMIT'),
  );

  @IsBoolean({
    message:
      'Set env variable INCLUDE_TESTING_MODULE to enable/disable testing module in the app',
  })
  includeTestingModule = configValidationUtility.convertToBoolean(
    this.configService.get('INCLUDE_TESTING_MODULE'),
  ) as boolean;

  constructor(private configService: ConfigService<any, true>) {
    configValidationUtility.validateConfig(this);
  }
}
