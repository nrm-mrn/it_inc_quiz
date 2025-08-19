import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthSuccessDto } from '../../dto/auth-success.dto';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DateTime, Duration } from 'luxon';
import {
  ACCESS_TOKEN_STRATEGY_INJECT_TOKEN,
  REFRESH_TOKEN_STRATEGY_INJECT_TOKEN,
} from '../../constants/auth-token.inject-constants';
import { CreateRefreshTokenDto } from '../../dto/create-refresh-token.dto';
import { UsersRepository } from '../../infrastructure/users.repository';
import { UserAccountConfig } from '../../config/user-account.config';

export class ReissueTokensCommand {
  constructor(public token: string) {}
}

@CommandHandler(ReissueTokensCommand)
export class ReissueTokensHandler
  implements ICommandHandler<ReissueTokensCommand, AuthSuccessDto>
{
  constructor(
    @Inject(ACCESS_TOKEN_STRATEGY_INJECT_TOKEN)
    private readonly jwtAccesTokService: JwtService,
    @Inject(REFRESH_TOKEN_STRATEGY_INJECT_TOKEN)
    private readonly jwtRefreshTokService: JwtService,
    private readonly usersRepository: UsersRepository,
    private readonly configService: UserAccountConfig,
  ) {}

  async execute(command: ReissueTokensCommand): Promise<AuthSuccessDto> {
    const payload = this.jwtRefreshTokService.decode<CreateRefreshTokenDto>(
      command.token,
    );

    const user = await this.usersRepository.findUserBySessionOrFail(
      payload.deviceId,
      payload.iat,
    );

    const rtInput: CreateRefreshTokenDto = {
      userId: payload.userId,
      deviceId: payload.deviceId,
      iat: Math.floor(DateTime.utc().toSeconds()),
    };
    const expiration = DateTime.utc()
      .plus(Duration.fromMillis(this.configService.refreshTokenDuration * 1000))
      .toJSDate();
    user.refreshSession(payload.deviceId, rtInput.iat, expiration);

    await this.usersRepository.saveUser(user);

    const refreshToken = this.jwtRefreshTokService.sign(rtInput);
    const accessToken = this.jwtAccesTokService.sign({ id: payload.userId });
    return { accessToken, refreshToken };
  }
}
