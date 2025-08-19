import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SessionViewDto } from '../../api/view-dto/session.view-dto';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { REFRESH_TOKEN_STRATEGY_INJECT_TOKEN } from '../../constants/auth-token.inject-constants';
import { CreateRefreshTokenDto } from '../../dto/create-refresh-token.dto';
import { DeviceAuthSession } from '../../domain/session.schema';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export class GetUserSessionsQuery {
  constructor(public token: string) {}
}

@QueryHandler(GetUserSessionsQuery)
export class GetUserSessionsQueryHandler
  implements IQueryHandler<GetUserSessionsQuery, SessionViewDto[]>
{
  constructor(
    @Inject(REFRESH_TOKEN_STRATEGY_INJECT_TOKEN)
    private readonly jwtRefreshTokService: JwtService,
    @InjectRepository(DeviceAuthSession)
    private readonly sessionsRepository: Repository<DeviceAuthSession>,
  ) {}

  async execute(query: GetUserSessionsQuery): Promise<SessionViewDto[]> {
    const payload = this.jwtRefreshTokService.decode<CreateRefreshTokenDto>(
      query.token,
    );
    const sessions = await this.sessionsRepository
      .createQueryBuilder('session')
      .where({ userId: payload.userId })
      .getMany();
    if (sessions.length === 0) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Not found any sessions for a valid refresh token',
      });
    }
    const res: SessionViewDto[] = [];
    sessions.forEach((session) => {
      res.push(SessionViewDto.mapToView(session));
    });
    return res;
  }
}
