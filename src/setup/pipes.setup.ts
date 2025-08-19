import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import {
  DomainException,
  Extension,
} from 'src/core/exceptions/domain-exceptions';

export const errorsFormatter = (
  errors: ValidationError[],
  errorMessage?: Extension[],
): Extension[] => {
  const errorsForResp = errorMessage || [];
  for (const error of errors) {
    if (!error.constraints && error.children?.length) {
      errorsFormatter(error.children, errorsForResp);
    } else if (error.constraints) {
      const constraintsKeys = Object.keys(error.constraints);
      constraintsKeys.forEach((key) => {
        errorsForResp.push({
          message: error.constraints![key]
            ? `${error.constraints![key]}; Received value: ${error?.value}`
            : '',
          key: error.property,
        });
      });
    }
  }
  return errorsForResp;
};

export function pipesSetup(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      stopAtFirstError: true,
      exceptionFactory: (errors) => {
        const formattedErrors = errorsFormatter(errors);
        throw new DomainException({
          code: DomainExceptionCode.ValidationError,
          message: 'validation failed',
          extensions: formattedErrors,
        });
      },
    }),
  );
}
