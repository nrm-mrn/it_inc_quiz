import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

export function cookieParserSetup(app: INestApplication) {
  app.use(cookieParser());
}
