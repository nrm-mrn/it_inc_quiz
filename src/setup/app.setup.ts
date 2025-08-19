import { NestExpressApplication } from '@nestjs/platform-express';
import { pipesSetup } from './pipes.setup';
import { cookieParserSetup } from './cookie.setup';
import { globalThrottler } from './global-requests-throttler.setup';

export function appSetup(app: NestExpressApplication) {
  cookieParserSetup(app);
  // proxySetup(app);
  // globalThrottler(app);
  pipesSetup(app);
  // swaggerSetup(app);
}
