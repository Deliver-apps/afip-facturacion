import { Between } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Jobs } from '../entities/Jobs.entity';

//Vamos a reducir este servicio al mes "En curso" y al mes anterior
export const getAllJobs = async (external: boolean) => {
  const today = new Date();
  const firstDayLastMonth = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1
  ); // Start of last month
  const maxDateThisMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ); // End of this month
  console.error(external);

  if (external) {
    const jobs = await AppDataSource.getRepository(Jobs).find({
      where: {
        createdAt: Between(firstDayLastMonth, maxDateThisMonth),
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return jobs;
  }

  const jobs = await AppDataSource.getRepository(Jobs).find({
    where: {
      createdAt: Between(firstDayLastMonth, maxDateThisMonth),
      external: external,
    },
    order: {
      createdAt: 'DESC',
    },
  });

  return jobs;
};
