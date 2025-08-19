import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserContextDto } from '../dto/user-context.dto';
import { Request } from 'express';

export const ExtractUserFromRequestIfExists = createParamDecorator(
  (data: unknown, context: ExecutionContext): UserContextDto | null => {
    const request = context.switchToHttp().getRequest<Request>();

    const user = request.user as UserContextDto;

    if (!user) {
      return null;
    }

    return user;
  },
);
