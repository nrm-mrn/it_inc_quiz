import { NestFactory } from '@nestjs/core';
import { appSetup } from './setup/app.setup';
import { NestExpressApplication } from '@nestjs/platform-express';
import { CoreConfig } from './core/core.config';
import { initAppModule } from './init-app-module';

async function bootstrap() {
  const DynamicAppModule = await initAppModule();
  const app =
    await NestFactory.create<NestExpressApplication>(DynamicAppModule);
  const configService = app.get<CoreConfig>(CoreConfig);
  appSetup(app);
  const port = configService.port;

  await app.listen(port);
}
void bootstrap();
