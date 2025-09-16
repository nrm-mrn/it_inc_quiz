import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DomainException, Extension } from '../domain-exceptions';
import { Response } from 'express';
import { DomainExceptionCode } from '../domain-exception-codes';
import {
  APIErrorResult,
  APIErrorResultExt,
  FieldError,
} from '../api-error.result';
import { CoreConfig } from 'src/core/core.config';

@Catch(DomainException)
export class DomainHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainHttpExceptionFilter.name);
  constructor(private readonly configService: CoreConfig) {}
  catch(exception: DomainException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const code = this.mapToHttpStatus(exception.code);
    if (exception.code === DomainExceptionCode.InternalServerError) {
      this.logger.error(exception.message, exception.stack);
    }
    // if (exception.code === DomainExceptionCode.ValidationError) {
    //   this.logger.error(exception.message);
    //   this.logger.error(exception.extensions);
    // }
    // if (exception.code === DomainExceptionCode.BadRequest) {
    //   this.logger.error(exception.message);
    //   this.logger.error(exception.extensions);
    // }
    let body = {};
    if (exception.extensions) {
      body = this.buildResponseBody(exception, exception.extensions);
    }
    response.status(code).json(body);
  }

  private mapToHttpStatus(code: DomainExceptionCode): number {
    switch (code) {
      case DomainExceptionCode.BadRequest:
      case DomainExceptionCode.ValidationError:
      case DomainExceptionCode.ConfirmationCodeExpired:
      case DomainExceptionCode.EmailNotConfirmed:
      case DomainExceptionCode.PasswordRecoveryCodeExpired:
        return HttpStatus.BAD_REQUEST;
      case DomainExceptionCode.Forbidden:
        return HttpStatus.FORBIDDEN;
      case DomainExceptionCode.NotFound:
        return HttpStatus.NOT_FOUND;
      case DomainExceptionCode.Unauthorized:
        return HttpStatus.UNAUTHORIZED;
      case DomainExceptionCode.InternalServerError:
        return HttpStatus.INTERNAL_SERVER_ERROR;
      default:
        return HttpStatus.I_AM_A_TEAPOT;
    }
  }

  private buildResponseBody(
    exception: DomainException,
    extensions: Extension[],
  ): APIErrorResult | APIErrorResultExt {
    const res: FieldError[] = [];
    extensions.forEach((ext) => {
      res.push(new FieldError(ext.message, ext.key));
    });

    if (this.configService.verboseErrors) {
      return {
        errorsMessages: res,
        message: exception.message,
      };
    } else {
      return { errorsMessages: res };
    }
  }
}
