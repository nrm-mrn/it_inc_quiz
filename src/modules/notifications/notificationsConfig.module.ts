import { Module } from '@nestjs/common';
import { NotificationsConfig } from './notifications.config';

@Module({
  providers: [NotificationsConfig],
  exports: [NotificationsConfig],
})
export class NotificationsConfigModule {}
