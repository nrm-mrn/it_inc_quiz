import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class TestingAPIService {
  constructor(private readonly dataSource: DataSource) {}

  async clearDb() {
    await this.dataSource.query(/*sql*/ `
      TRUNCATE TABLE users,
      question,
      game,
      game_question,
      player,
      player_answer
      CASCADE
      `);
  }
}
