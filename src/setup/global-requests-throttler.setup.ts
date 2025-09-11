import { NestExpressApplication } from '@nestjs/platform-express';

export function globalThrottler(app: NestExpressApplication) {
  //throttler to bypass grok rate limits
  app.use(async (req, res, next) => {
    await new Promise((res) => setTimeout(res, 300));
    next();
  });
}
