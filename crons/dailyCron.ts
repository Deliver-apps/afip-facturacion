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
  userId: number
) {
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
    }
  );

  cronTimes.forEach((cronTime, index) => {
    const taskName = `RandomCronJob_${cronTime}`;
    scheduleCronJobBill(
      cronTime,
      taskName,
      parts[index],
      salePoint,
      category,
      userId
    );
  });
}
