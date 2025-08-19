import {
  UseGuards,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Body,
  Ip,
  Res,
  Req,
  Get,
  Headers,
} from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { ThrottlerGuard, SkipThrottle } from '@nestjs/throttler';
import { GetUserInfoQuery } from '../application/query/get-user-info.query';
import { LoginUserCommand } from '../application/usecases/login-user.usecase';
import { LogoutCommand } from '../application/usecases/logout-user.usecase';
import { RegisterUserCommand } from '../application/usecases/register-user.usecase';
import { ReissueTokensCommand } from '../application/usecases/reissue-tokens.usecase';
import { UserAccountConfig } from '../config/user-account.config';
import { AuthSuccessDto } from '../dto/auth-success.dto';
import { LoginDto } from '../dto/login.dto';
import { JwtAuthGuard } from '../guards/bearer/jwt-auth.guard';
import { RefreshTokenGuard } from '../guards/bearer/jwt-refresh-token-guard';
import { ConfirmEmailInputDto } from './input-dto/email-confirm.input-dto';
import { ConfirmPasswordInputDto } from './input-dto/pass-confirm.input-dto';
import { PassRecoverInputDto } from './input-dto/pass-recover.input-dto';
import { RegisterUserInputDto } from './input-dto/register-user.input-dto';
import { ResendEmailConfirmationInputDto } from './input-dto/resend-email.input-dto';
import { UserLoginInputDto } from './input-dto/user-login-dto';
import { MeViewDto } from './view-dto/users.view-dto';
import { Request, Response } from 'express';
import { ResendEmailConfirmationCommand } from '../application/usecases/resend-email-confirmation.usecase';
import { ConfirmUserEmailCommand } from '../application/usecases/confirm-user-email.usecase';
import { RecoverPasswordCommand } from '../application/usecases/recover-password.usecase';
import { ConfirmPasswordCommand } from '../application/usecases/confirm-new-password.usecase';
import { ExtractUserFromRequest } from '../guards/decorators/extract-user-from-request.decorator';
import { UserContextDto } from '../guards/dto/user-context.dto';

// @UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly configService: UserAccountConfig,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: UserLoginInputDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
    @Res() response: Response,
  ) {
    if (!userAgent) {
      userAgent = 'default agent';
    }

    const creds: LoginDto = {
      loginOrEmail: body.loginOrEmail,
      password: body.password,
      ip: ip ? ip : '',
      title: userAgent,
    };
    const { accessToken, refreshToken } = await this.commandBus.execute<
      LoginUserCommand,
      AuthSuccessDto
    >(
      new LoginUserCommand(
        creds.loginOrEmail,
        creds.password,
        creds.ip,
        creds.title,
      ),
    );
    response
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: this.configService.secureCookie,
      })
      .send({ accessToken });
  }

  @UseGuards(RefreshTokenGuard)
  @SkipThrottle()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async reissueTokens(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies.refreshToken as string;
    const { refreshToken, accessToken } = await this.commandBus.execute<
      ReissueTokensCommand,
      AuthSuccessDto
    >(new ReissueTokensCommand(token));
    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: this.configService.secureCookie,
      })
      .send({ accessToken });
  }

  @UseGuards(RefreshTokenGuard)
  @SkipThrottle()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies.refreshToken as string;
    await this.commandBus.execute(new LogoutCommand(token));
    res.clearCookie('refreshToken').send();
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getUserInfo(
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<MeViewDto> {
    return this.queryBus.execute(new GetUserInfoQuery(user.userId));
  }

  @Post('registration')
  @HttpCode(HttpStatus.NO_CONTENT)
  async registerUser(@Body() body: RegisterUserInputDto) {
    return this.commandBus.execute<RegisterUserCommand, void>(
      new RegisterUserCommand(body.login, body.password, body.email),
    );
  }

  @Post('registration-email-resending')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendEmailConfirmation(@Body() dto: ResendEmailConfirmationInputDto) {
    return this.commandBus.execute<ResendEmailConfirmationCommand, void>(
      new ResendEmailConfirmationCommand(dto.email),
    );
  }

  @Post('registration-confirmation')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmEmail(@Body() dto: ConfirmEmailInputDto) {
    return this.commandBus.execute<ConfirmUserEmailCommand, void>(
      new ConfirmUserEmailCommand(dto.code),
    );
  }

  @Post('password-recovery')
  @HttpCode(HttpStatus.NO_CONTENT)
  async recoverPassword(@Body() dto: PassRecoverInputDto) {
    return this.commandBus.execute<RecoverPasswordCommand, void>(
      new RecoverPasswordCommand(dto.email),
    );
  }

  @Post('new-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmPassword(@Body() dto: ConfirmPasswordInputDto) {
    return this.commandBus.execute<ConfirmPasswordCommand, void>(
      new ConfirmPasswordCommand(dto.recoveryCode, dto.newPassword),
    );
  }
}
