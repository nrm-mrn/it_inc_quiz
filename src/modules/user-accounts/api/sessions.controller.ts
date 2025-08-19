import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { RefreshTokenGuard } from '../guards/bearer/jwt-refresh-token-guard';
import { GetUserSessionsQuery } from '../application/query/get-all-user-sessions.query';
import { SessionViewDto } from './view-dto/session.view-dto';
import { UuidValidationPipe } from 'src/core/pipes/uuid-validation-pipe.service';
import { LogoutAnotherSessionCommand } from '../application/usecases/logout-another-session.usecase';
import { LogoutOtherSessionsCommand } from '../application/usecases/logout-all-other-sessions.usecase';
import { UUID } from 'crypto';

@UseGuards(RefreshTokenGuard)
@Controller('security')
export class DevicesSecurityController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get('devices')
  @HttpCode(HttpStatus.OK)
  async getDevices(@Req() req: Request) {
    const token = req.cookies.refreshToken as string;
    return this.queryBus.execute<GetUserSessionsQuery, SessionViewDto[]>(
      new GetUserSessionsQuery(token),
    );
  }

  @Delete('devices/:deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAnotherSession(
    @Req() req: Request,
    @Param('deviceId', UuidValidationPipe) deviceId: UUID,
  ) {
    const token = req.cookies.refreshToken as string;
    await this.commandBus.execute(
      new LogoutAnotherSessionCommand(token, deviceId),
    );
  }

  @Delete('devices/')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOtherSessions(@Req() req: Request) {
    return this.commandBus.execute<LogoutOtherSessionsCommand, void>(
      new LogoutOtherSessionsCommand(req.cookies.refreshToken as string),
    );
  }
}
