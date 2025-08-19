import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { REFRESH_TOKEN_STRATEGY_INJECT_TOKEN } from '../../constants/auth-token.inject-constants';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { CreateRefreshTokenDto } from '../../dto/create-refresh-token.dto';
import { UUID } from 'crypto';
import { UsersRepository } from '../../infrastructure/users.repository';

export class LogoutAnotherSessionCommand {
  constructor(
    public token: string,
    public deviceId: UUID,
  ) {}
}

@CommandHandler(LogoutAnotherSessionCommand)
export class LogoutAnotherSessionHandler
  implements ICommandHandler<LogoutAnotherSessionCommand>
{
  constructor(
    @Inject(REFRESH_TOKEN_STRATEGY_INJECT_TOKEN)
    private readonly jwtRefreshTokService: JwtService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(command: LogoutAnotherSessionCommand): Promise<any> {
    const payload = this.jwtRefreshTokService.decode<CreateRefreshTokenDto>(
      command.token,
    );
    const deviceId = payload.deviceId;

    //NOTE: check that refresh token session is active
    const user = await this.usersRepository.findUserBySessionOrFail(
      deviceId,
      payload.iat,
    );
    //NOTE: check that userId is the same in token and in the deviceToDelete
    const targetUser = await this.usersRepository.findUserByDeviceIdOrFail(
      command.deviceId,
    );
    if (targetUser.id !== payload.userId) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'Could not delete session of another user',
      });
    }
    user.deleteSession(command.deviceId);
    await this.usersRepository.saveUser(user);
  }
}
