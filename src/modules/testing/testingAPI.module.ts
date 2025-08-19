import { Module } from '@nestjs/common';
import { TestingAPIController } from './testingAPI.controller';
import { testingAPIService } from './testingAPI.service';

@Module({
  controllers: [TestingAPIController],
  providers: [testingAPIService],
})
export class TestingApiModule {}
