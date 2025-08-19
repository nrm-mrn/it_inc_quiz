import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

config({
  path: __dirname + '/../.env.development',
});

const migrationOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: true,
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  entities: ['src/**/*.schema.ts'],
};

export default new DataSource(migrationOptions);
