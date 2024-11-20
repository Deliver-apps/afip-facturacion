import cron from 'node-cron';
import { generateRandomCronTimes } from '../helpers/cronRandomized';
import { scheduleCronJobBill } from './cronGenerator';
import {
  divideNumberRandomly,
  getRandomNumberBetween,
  sumParts,
} from '../helpers/randomized';
import { cronToTime } from '../helpers/parsedCron';
import { logger } from '../logger';
import { apiInstanceEmail, sendSmtpEmail } from '../config/mailer';
import { AppDataSource } from '../data-source';
import { Jobs } from '../entities/Jobs.entity';
import { Status } from '../types/status.types';

export async function scheduleRandomCronJobsForToday(
  startHour: number,
  endHour: number,
  minValue: number,
  maxValue: number,
  times: number,
  startDay: number,
  endDay: number,
  cuit: string,
  category: string,
  salePoint: number,
  userId: number,
  external: boolean
) {
  console.error(
    `Start hour: ${startHour} End hour: ${endHour} Start day: ${startDay} End day: ${endDay} minValue: ${minValue} maxValue: ${maxValue} times: ${times} cuit: ${cuit} category: ${category} salePoint: ${salePoint} userId: ${userId}`
  );
  const cronTimes = generateRandomCronTimes(
    times,
    startHour,
    endHour,
    startDay,
    endDay
  );
  const randomNumber = getRandomNumberBetween(minValue, maxValue);

  logger.error(`Random number: ${randomNumber} and times: ${times}`);
  const parts = divideNumberRandomly(randomNumber, times);
  const datesFromCron = cronTimes
    .map((time) => {
      const stringTime = cronToTime(time);
      return stringTime;
    })
    .filter((time) => time !== null);
  const formatListAsHtml = (list: string[] | number[]) => {
    return list.map((item) => `<li>${item}</li>`).join('');
  };

  const formatPartsAsHtmlMoney = (list: number[]) => {
    return list.map((item) => `<li>$ ${item}</li>`).join('');
  };

  sendSmtpEmail.subject = 'Creacion de facturas para:' + cuit;
  sendSmtpEmail.to = [
    {
      email: 'carlosjoelsalda@gmail.com',
    },
    {
      email: 'cosmefacturita@gmail.com',
    },
  ];

  const htmlContent = `
    <h1>Facturacion Py</h1>
    <p>Valores divididos a correr durante el Día:</p>
    <ul>
      ${formatPartsAsHtmlMoney(parts)}
    </ul>
    <p>Total de valores a correr: ${sumParts(parts)}</p>
    <br>
    <p>Horas de ejecución:</p>
    <ul>
      ${formatListAsHtml(datesFromCron)}
    </ul>
  `;

  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.sender = {
    name: 'Facturacion',
    email: 'carlosjoelsalda@gmail.com',
  };

  apiInstanceEmail.sendTransacEmail(sendSmtpEmail).then(
    (data) => {
      logger.info('Email sent successfully');
    },
    (error) => {
      console.log(error);
      throw new Error('Error al enviar correo electrónico');
    }
  );

  for (const [index, cronTime] of cronTimes.entries()) {
    try {
      await AppDataSource.transaction(async (manager) => {
        const newJob = AppDataSource.getRepository(Jobs).create({
          cronExpression: cronTime,
          userId: userId,
          status: Status.Pending,
          valueToBill: parts[index],
          salePoint,
          external,
        });
        const taskName = `Job:${newJob.id}`;

        scheduleCronJobBill(
          cronTime,
          taskName,
          parts[index],
          salePoint,
          category,
          userId,
          newJob.id
        );

        console.log('Inserting Job:', newJob); // Log the job before saving it
        await manager.save(newJob);
        console.log('Job inserted successfully');
      });
    } catch (error) {
      console.log(error);
      throw new Error('Error al crear tarea');
    } finally {
      console.log('Finalizado Update Tabla');
    }
  }
}
