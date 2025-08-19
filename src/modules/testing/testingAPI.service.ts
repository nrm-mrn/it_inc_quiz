import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class testingAPIService {
  constructor(private readonly dataSource: DataSource) {}

  async clearDb() {
    const q = this.dataSource.createQueryRunner();
    await q.query(/*sql*/ `
      TRUNCATE TABLE users, blog, post, post_like, comment, comment_like CASCADE
      `);
  }
}
