import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainExceptionCode } from '../domain-exception-codes';
import { CoreConfig } from 'src/core/core.config';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  logger = new Logger(AllExceptionFilter.name);
  constructor(private readonly configService: CoreConfig) {}
  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const message = exception.message || 'Unknown exception occured';
    const code = HttpStatus.INTERNAL_SERVER_ERROR;
    this.logger.error(exception.message, exception.stack);
    const resBody = this.buildResponseBody(req.url, message);
    res.status(code).json(resBody);
  }

  private buildResponseBody(reqUrl: string, message: string) {
    if (this.configService.verboseErrors) {
      return {
        timestamp: new Date().toISOString(),
        path: reqUrl,
        message,
        extensions: [],
        code: DomainExceptionCode.InternalServerError,
      };
    } else {
      return {
        timestamp: new Date().toISOString(),
        path: null,
        message: 'Server error occured',
        extensions: [],
        code: DomainExceptionCode.InternalServerError,
      };
    }
  }
}
