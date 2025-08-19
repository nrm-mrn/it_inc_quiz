import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UsersController } from './api/users.controller';
import { HashService } from './application/passHash.service';
import { GetAllUsersQueryHandler } from './application/query/get-all-users.query';
import { GetUserQueryHandler } from './application/query/get-user.query';
import { CreateUserByAdminHandler } from './application/usecases/create-user.usecase';
import { DeleteUserHandler } from './application/usecases/delete-user.usecase';
import { UsersService } from './application/users.service';
import { UserAccountConfig } from './config/user-account.config';
import {
  ACCESS_TOKEN_STRATEGY_INJECT_TOKEN,
  REFRESH_TOKEN_STRATEGY_INJECT_TOKEN,
} from './constants/auth-token.inject-constants';
import { BasicAuthGuard } from './guards/basic/basic-auth.guard';
import { UsersRepository } from './infrastructure/users.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { RegisterUserHandler } from './application/usecases/register-user.usecase';
import { GetUserInfoQueryHandler } from './application/query/get-user-info.query';
import { ConfirmUserEmailHandler } from './application/usecases/confirm-user-email.usecase';
import { ResendEmailConfirmationHandler } from './application/usecases/resend-email-confirmation.usecase';
import { RecoverPasswordHandler } from './application/usecases/recover-password.usecase';
import { ConfirmPasswordHandler } from './application/usecases/confirm-new-password.usecase';
import { LoginUserHandler } from './application/usecases/login-user.usecase';
import { ReissueTokensHandler } from './application/usecases/reissue-tokens.usecase';
import { LogoutCommandHandler } from './application/usecases/logout-user.usecase';
import { LogoutAnotherSessionHandler } from './application/usecases/logout-another-session.usecase';
import { LogoutOtherSessionHandler } from './application/usecases/logout-all-other-sessions.usecase';
import { AuthController } from './api/auth.controller';
import { JwtAuthGuard } from './guards/bearer/jwt-auth.guard';
import { JwtStrategy } from './guards/bearer/jwt.strategy';
import { RefreshTokenGuard } from './guards/bearer/jwt-refresh-token-guard';
import { EmailTemplates } from '../notifications/email.templates';
import { ThrottlerModule } from '@nestjs/throttler';
import { CoreConfig } from 'src/core/core.config';
import { DevicesSecurityController } from './api/sessions.controller';
import { GetUserSessionsQueryHandler } from './application/query/get-all-user-sessions.query';
import { UsersExternalService } from './application/users.external-service';
import { JwtOptionalAuthGuard } from './guards/bearer/jwt-optional-guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/user.schema';
import { PasswordRecovery } from './domain/passwordRecovery.schema';
import { EmailConfirmation } from './domain/emailConfirmation.schema';
import { DeviceAuthSession } from './domain/session.schema';

const queries = [
  GetUserQueryHandler,
  GetAllUsersQueryHandler,
  GetUserInfoQueryHandler,
  GetUserSessionsQueryHandler,
];
const useCases = [
  CreateUserByAdminHandler,
  DeleteUserHandler,
  RegisterUserHandler,
  ResendEmailConfirmationHandler,
  LoginUserHandler,
  ConfirmUserEmailHandler,
  ReissueTokensHandler,
  RecoverPasswordHandler,
  ConfirmPasswordHandler,
  LogoutCommandHandler,
  LogoutAnotherSessionHandler,
  LogoutOtherSessionHandler,
];

@Module({
  imports: [
    JwtModule.register({}),
    NotificationsModule,
    TypeOrmModule.forFeature([
      PasswordRecovery,
      EmailConfirmation,
      DeviceAuthSession,
      User,
    ]),
    ThrottlerModule.forRootAsync({
      useFactory: (configService: CoreConfig) => ({
        throttlers: [
          {
            ttl: configService.requestsTTL,
            limit: configService.requestsLimit,
          },
        ],
      }),
      inject: [CoreConfig],
    }),
  ],
  controllers: [UsersController, AuthController, DevicesSecurityController],
  providers: [
    UserAccountConfig,
    {
      provide: ACCESS_TOKEN_STRATEGY_INJECT_TOKEN,
      useFactory: (configService: UserAccountConfig) => {
        return new JwtService({
          secret: configService.jwtAccessSecret,
          signOptions: {
            expiresIn: `${configService.accessTokenDuration}s`,
          },
        });
      },
      inject: [UserAccountConfig],
    },
    {
      provide: REFRESH_TOKEN_STRATEGY_INJECT_TOKEN,
      useFactory: (configService: UserAccountConfig) => {
        return new JwtService({
          secret: configService.jwtRefreshSecret,
          signOptions: {
            expiresIn: `${configService.refreshTokenDuration}s`,
          },
        });
      },
      inject: [UserAccountConfig],
    },
    BasicAuthGuard,
    HashService,
    UsersService,
    UsersRepository,
    BasicAuthGuard,
    JwtAuthGuard,
    JwtOptionalAuthGuard,
    JwtStrategy,
    RefreshTokenGuard,
    HashService,
    EmailTemplates,
    UsersExternalService,
    ...queries,
    ...useCases,
  ],
  exports: [
    BasicAuthGuard,
    UserAccountConfig,
    JwtAuthGuard,
    JwtOptionalAuthGuard,
    UsersExternalService,
  ],
})
export class UserAccountsModule {}
