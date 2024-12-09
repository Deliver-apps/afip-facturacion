import { AppDataSource } from '../data-source';
import { Jobs } from '../entities/Jobs.entity';
import { logger } from '../logger';
import { Status } from '../types/status.types';
import parser from 'cron-parser';
import moment from 'moment-timezone';
import { getUserCertificateAndKey } from '../services/vault.service';
import Afip from '@afipsdk/afip.js';
import { getUserById } from '../services/user.service';
import { config } from '../config/config';
import { scheduleCronJobBill } from './cronGenerator';

async function executePendingJobs() {
  try {
    const getPendingJobs = await AppDataSource.getRepository(Jobs).find({
      where: { status: Status.Pending },
    });

    logger.warn(`Found ${getPendingJobs.length} pending jobs`);

    const timezone = 'America/Argentina/Buenos_Aires';

    const filteredJobsToRun = getPendingJobs.filter((job) => {
      try {
        const buenosAiresNow = moment.tz(new Date(), timezone).startOf('day'); // Start of today
        const today = buenosAiresNow.clone();

        // Parse the cron expression with timezone
        const interval = parser.parseExpression(job.cronExpression, {
          tz: timezone,
          currentDate: buenosAiresNow.toDate(),
        });

        let lastExecutionMoment;

        try {
          // Get the last execution time
          const lastExecution = interval.prev().toDate();
          lastExecutionMoment = moment.tz(lastExecution, timezone);
        } catch (e) {
          // No previous executions, job starts in the future
          return false; // Exclude the job
        }

        // Check if the last execution was before today
        if (lastExecutionMoment.isBefore(today)) {
          // Include the job
          return true;
        } else {
          // Exclude the job
          return false;
        }
      } catch (error) {
        console.error(
          `Error parsing cron expression for job ${job.id}:`,
          error
        );
        return false; // Exclude the job on error
      }
    });

    logger.warn(`Found ${filteredJobsToRun.length} old jobs`);

    const filterFutureJobs = getPendingJobs.filter((job) => {
      try {
        const buenosAiresNow = moment.tz(new Date(), timezone).startOf('day'); // Start of today in the specified timezone

        // Parse the cron expression with timezone
        const interval = parser.parseExpression(job.cronExpression, {
          tz: timezone,
          currentDate: buenosAiresNow.toDate(), // Start checking from today
        });

        let nextExecutionMoment;

        try {
          // Get the next execution time
          const nextExecution = interval.next().toDate();
          nextExecutionMoment = moment.tz(nextExecution, timezone);
        } catch (e) {
          return false; // Exclude the job if no next execution is found
        }

        const currentMonth = buenosAiresNow.month();
        const nextExecutionMonth = nextExecutionMoment.month();

        // Only include jobs with next execution in the current month
        if (
          nextExecutionMoment.isAfter(buenosAiresNow) &&
          job.createdAt.getMonth() === currentMonth &&
          nextExecutionMonth === currentMonth
        ) {
          return true;
        } else {
          return false;
        }
      } catch (error) {
        console.error(
          `Error parsing cron expression for job ${job.id}:`,
          error
        );
        return false; // Exclude the job on error
      }
    });

    logger.warn(`Found ${filterFutureJobs.length} future jobs`);

    for (const job of filteredJobsToRun) {
      logger.info(`Executing job: ${job.id}`);
      try {
        const { cert, key } = await getUserCertificateAndKey(job.userId);
        const user = await getUserById(job.userId);

        const afip = new Afip({
          CUIT: user?.username,
          cert,
          key,
          production: true,
          access_token: config.afipSdkToken,
        });

        const response = await afip.ElectronicBilling.createNextVoucher({
          CantReg: 1, // The number of invoices to issue
          PtoVta: job.salePoint, // Point of sale number (the one you just created)
          CbteTipo: 11, // Type of document (11 for Electronic Billing)
          Concepto: 1, // Products
          DocTipo: 99, // Document type (99 for Consumidor Final)
          DocNro: 0, // Document number (0 for Consumidor Final)
          CbteFch: parseInt(
            new Date().toISOString().slice(0, 10).replace(/-/g, '')
          ), // Date in format YYYYMMDD
          ImpTotal: job.valueToBill, // Total amount
          ImpNeto: job.valueToBill, // Net amount
          ImpIVA: 0, // VAT amount
          MonId: 'PES', // Currency
          MonCotiz: 1, // Currency rate
        });

        if (response) {
          logger.info('Factura generada' + response.CAE);
        } else {
          logger.error('Error al generar factura');
          job.status = Status.Failed;
          await AppDataSource.getRepository(Jobs).save(job);
          continue;
        }
        job.status = Status.Completed;
        await AppDataSource.getRepository(Jobs).save(job);
        logger.info(`Job ${job.id} executed successfully`);
      } catch (error) {
        job.status = Status.Failed;
        await AppDataSource.getRepository(Jobs).save(job);
        console.error(`Error parsing cron expression for last job`, error);
      }
    }

    for (const job of filterFutureJobs) {
      const cron = job.cronExpression;
      const taskName = `Job:${job.id}`;
      scheduleCronJobBill(
        cron,
        taskName,
        job.valueToBill,
        job.salePoint,
        'A',
        job.userId,
        job.id
      );

      logger.info(`Scheduled job: ${taskName} with expression: ${cron}`);
    }
  } catch (error) {
    console.error(`Error parsing cron expression for last job`, error);
  }
}

export { executePendingJobs };
