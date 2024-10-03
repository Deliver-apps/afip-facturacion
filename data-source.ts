import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from './config/config';
import { Jobs } from './entities/Jobs.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.postgresURL,
  synchronize: true,
  logging: false,
  entities: [Jobs],
  migrations: [],
  subscribers: [],
});
