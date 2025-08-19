import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { REFRESH_TOKEN_STRATEGY_INJECT_TOKEN } from '../../constants/auth-token.inject-constants';
import { CreateRefreshTokenDto } from '../../dto/create-refresh-token.dto';
import { UsersRepository } from '../../infrastructure/users.repository';

export class LogoutCommand {
  constructor(public token: string) {}
}

@CommandHandler(LogoutCommand)
export class LogoutCommandHandler implements ICommandHandler<LogoutCommand> {
  constructor(
    @Inject(REFRESH_TOKEN_STRATEGY_INJECT_TOKEN)
    private readonly jwtRefreshTokService: JwtService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(command: LogoutCommand): Promise<any> {
    const payload = this.jwtRefreshTokService.verify<CreateRefreshTokenDto>(
      command.token,
    );
    //NOTE: check that refresh token session is active
    const user = await this.usersRepository.findUserBySessionOrFail(
      payload.deviceId,
      payload.iat,
    );
    user.deleteSession(payload.deviceId);
    await this.usersRepository.saveUser(user);
  }
}
