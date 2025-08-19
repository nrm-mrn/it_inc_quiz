import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtOptionalAuthGuard extends AuthGuard('jwt') {
  // canActivate(context: ExecutionContext) {
  //   return super.canActivate(context);
  // }

  handleRequest(err: any, user: any) {
    //NOTE:super.handleRequest(err, user, info, context, status);
    // мы не будем вызывать здесь базовый метод суперкласса, в нём написано вот это:
    // кидаем ошибку если нет юзера или если другая ошибка (например JWT протух)...
    // handleRequest(err, user, info, context, status) {
    //   if (err || !user) {
    //     throw err || new common_1.UnauthorizedException();
    //   }
    //   return user;
    // }
    // а мы вернём просто null и не будем процессить ошибку и null
    if (err || !user) {
      return null;
    } else {
      return user;
    }
  }
}
