import { DynamicModule, Module } from '@nestjs/common';
import { CoreConfig } from './core/core.config';
import { configModule } from './config-dynamic-module';
import { CoreModule } from './core/core.module';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionFilter } from './core/exceptions/filters/all-exceptions.filter';
import { DomainHttpExceptionFilter } from './core/exceptions/filters/domain-exception.filter';
import { ThrottlerExceptionFilter } from './core/exceptions/filters/throttler-exceptions.filter';
import { UserAccountsModule } from './modules/user-accounts/user-accounts.module';
import { TestingApiModule } from './modules/testing/testingAPI.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizModule } from './modules/quiz/quiz.module';

@Module({
  imports: [
    configModule,
    CoreModule,
    TypeOrmModule.forRootAsync({
      imports: [CoreModule],
      useFactory: (coreConfig: CoreConfig) => ({
        type: 'postgres',
        host: coreConfig.dbHost,
        port: coreConfig.dbPort,
        username: coreConfig.dbUser,
        password: coreConfig.dbPass,
        database: coreConfig.dbName,
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
      }),
      inject: [CoreConfig],
    }),
    UserAccountsModule,
    QuizModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ThrottlerExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: DomainHttpExceptionFilter,
    },
  ],
})
export class AppModule {
  static async forRoot(coreConfig: CoreConfig): Promise<DynamicModule> {
    return {
      module: AppModule,
      imports: [...(coreConfig.includeTestingModule ? [TestingApiModule] : [])],
    };
  }
}
