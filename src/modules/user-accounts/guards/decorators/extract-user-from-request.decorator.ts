import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import { Request } from 'express';
import { UserContextDto } from '../dto/user-context.dto';

export const ExtractUserFromRequest = createParamDecorator(
  (data: unknown, context: ExecutionContext): UserContextDto => {
    const request = context.switchToHttp().getRequest<Request>();

    const user = request.user as UserContextDto;

    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'there is no user in the request object!',
      });
    }

    return user;
  },
);
