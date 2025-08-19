import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { REFRESH_TOKEN_STRATEGY_INJECT_TOKEN } from '../../constants/auth-token.inject-constants';
import { CreateRefreshTokenDto } from '../../dto/create-refresh-token.dto';
import { UsersRepository } from '../../infrastructure/users.repository';

export class LogoutOtherSessionsCommand {
  constructor(public token: string) {}
}

@CommandHandler(LogoutOtherSessionsCommand)
export class LogoutOtherSessionHandler
  implements ICommandHandler<LogoutOtherSessionsCommand>
{
  constructor(
    @Inject(REFRESH_TOKEN_STRATEGY_INJECT_TOKEN)
    private readonly jwtRefreshTokService: JwtService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(command: LogoutOtherSessionsCommand): Promise<any> {
    const payload = this.jwtRefreshTokService.decode<CreateRefreshTokenDto>(
      command.token,
    );
    const deviceId = payload.deviceId;

    const user = await this.usersRepository.findUserBySessionOrFail(
      deviceId,
      payload.iat,
    );
    user.deleteOtherSessions(deviceId);
    await this.usersRepository.saveUser(user);
  }
}
