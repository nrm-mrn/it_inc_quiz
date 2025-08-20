import { Module } from '@nestjs/common';
import { TestingAPIController } from './testingAPI.controller';
import { TestingAPIService } from './testingAPI.service';

@Module({
  controllers: [TestingAPIController],
  providers: [TestingAPIService],
})
export class TestingApiModule {}
