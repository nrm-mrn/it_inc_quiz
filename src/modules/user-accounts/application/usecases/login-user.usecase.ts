import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthSuccessDto } from '../../dto/auth-success.dto';
import { UsersRepository } from '../../infrastructure/users.repository';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DateTime, Duration } from 'luxon';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import {
  ACCESS_TOKEN_STRATEGY_INJECT_TOKEN,
  REFRESH_TOKEN_STRATEGY_INJECT_TOKEN,
} from '../../constants/auth-token.inject-constants';
import { CreateAccessTokenDto } from '../../dto/create-access-token.dto';
import { CreateRefreshTokenDto } from '../../dto/create-refresh-token.dto';
import { HashService } from '../passHash.service';
import { UserAccountConfig } from '../../config/user-account.config';
import { randomUUID } from 'crypto';
import { CreateSessionDomainDto } from '../../domain/dto/create-session-domain-dto';

export class LoginUserCommand {
  constructor(
    public loginOrEmail: string,
    public password: string,
    public ip: string,
    public title: string,
  ) {}
}

@CommandHandler(LoginUserCommand)
export class LoginUserHandler
  implements ICommandHandler<LoginUserCommand, AuthSuccessDto>
{
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passHashService: HashService,
    @Inject(ACCESS_TOKEN_STRATEGY_INJECT_TOKEN)
    private readonly jwtAccesTokService: JwtService,
    @Inject(REFRESH_TOKEN_STRATEGY_INJECT_TOKEN)
    private readonly jwtRefreshTokService: JwtService,
    private readonly configService: UserAccountConfig,
  ) {}
  async execute(command: LoginUserCommand): Promise<AuthSuccessDto> {
    const user = await this.usersRepository.findUserByLoginOrEmail(
      command.loginOrEmail,
    );
    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Wrong login or password',
      });
    }
    await this.checkPass(command.password, user.passHash);
    const rtInput: CreateRefreshTokenDto = {
      userId: user.id,
      deviceId: randomUUID(),
      iat: Math.floor(DateTime.utc().toSeconds()),
    };
    const accTInput: CreateAccessTokenDto = {
      id: user.id,
    };
    const accessToken = this.jwtAccesTokService.sign(accTInput);
    const refreshToken = this.jwtRefreshTokService.sign(rtInput);

    const sessionInput: CreateSessionDomainDto = {
      deviceId: rtInput.deviceId,
      userId: rtInput.userId,
      iat: rtInput.iat,
      ip: command.ip,
      title: command.title,
      expiration: DateTime.utc()
        .plus(
          Duration.fromMillis(this.configService.refreshTokenDuration * 1000),
        )
        .toJSDate(),
    };
    user.addSession({ ...sessionInput });

    await this.usersRepository.saveUser(user);

    return { accessToken, refreshToken };
  }

  private async checkPass(inputPassword: string, passHash: string) {
    const isValidPass = await this.passHashService.compareHash(
      inputPassword,
      passHash,
    );
    if (!isValidPass) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Wrong login or password',
      });
    }
  }
}
