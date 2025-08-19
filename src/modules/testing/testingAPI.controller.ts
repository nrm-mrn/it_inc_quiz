import { Controller, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { testingAPIService } from './testingAPI.service';

@Controller('testing')
export class TestingAPIController {
  constructor(private readonly testinApiService: testingAPIService) {}

  @Delete('all-data')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearAllData() {
    return this.testinApiService.clearDb();
  }
}
