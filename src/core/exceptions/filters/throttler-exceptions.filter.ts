import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';
import { CoreConfig } from 'src/core/core.config';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  constructor(private readonly configService: CoreConfig) {}
  catch(exception: ThrottlerException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const message = 'Too many requests';
    const code = HttpStatus.TOO_MANY_REQUESTS;
    const resBody = this.buildResponseBody(req.url, message);
    res.status(code).json(resBody);
  }

  private buildResponseBody(reqUrl: string, message: string) {
    if (this.configService.verboseErrors) {
      return {
        timestamp: new Date().toISOString(),
        path: reqUrl,
        message,
      };
    } else {
      return {
        timestamp: new Date().toISOString(),
        path: null,
        message: 'Too many requests',
      };
    }
  }
}
