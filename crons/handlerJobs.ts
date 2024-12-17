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
    const now = moment.tz(new Date(), timezone);

    // Identify Overdue Jobs
    const overdueJobs: Jobs[] = [];
    for (const job of getPendingJobs) {
      try {
        const interval = parser.parseExpression(job.cronExpression, {
          tz: timezone,
          currentDate: now.toDate(),
        });

        let prevExecutionTime;
        try {
          prevExecutionTime = moment.tz(interval.prev().toDate(), timezone);
        } catch (e) {
          // If we can't find a previous execution, the job hasn't had a past run.
          // This might mean it's never run before. We'll check next execution soon.
          prevExecutionTime = null;
        }

        if (prevExecutionTime) {
          // Check if this past scheduled run happened after the job was created.
          if (
            prevExecutionTime.isAfter(moment(job.createdAt)) &&
            prevExecutionTime.isBefore(now)
          ) {
            // The job was supposed to run in the past (after creation time),
            // but it's still pending, so it's overdue.
            console.log(
              'Job is overdue:',
              job.id,
              prevExecutionTime.toDate(),
              job.createdAt,
              job.cronExpression
            );
            overdueJobs.push(job);
          }
        } else {
          // No prev run found. Let's check next execution:
          // If there's a next scheduled run that's already in the past relative to `now`,
          // that would mean we missed it. But by definition, interval.next() won't give a past time.
          // If we suspect a missed first run, consider adjusting logic here:
          // However, typically no prev run means it starts in the future, so no action here.
        }
      } catch (error) {
        console.error(
          `Error parsing cron expression for job ${job.id}:`,
          error
        );
      }
    }

    logger.warn(
      `Found ${overdueJobs.length} jobs that are overdue (due to run now)`
    );

    // Remove overdue jobs from the pending jobs list before checking future jobs
    const pendingForFuture = getPendingJobs.filter(
      (job) => !overdueJobs.some((overdueJob) => overdueJob.id === job.id)
    );

    // Identify Future Jobs
    const futureJobs = [];
    for (const job of pendingForFuture) {
      try {
        const interval = parser.parseExpression(job.cronExpression, {
          tz: timezone,
          currentDate: now.toDate(),
        });

        let nextExecutionTime;
        try {
          nextExecutionTime = moment.tz(interval.next().toDate(), timezone);
        } catch (e) {
          // If there's no next execution time, skip
          continue;
        }

        // If next execution is strictly in the future
        if (nextExecutionTime.isAfter(now)) {
          // Optional: Check if it's in the current month
          if (nextExecutionTime.month() === now.month()) {
            futureJobs.push(job);
          }
        }
      } catch (error) {
        console.error(
          `Error parsing cron expression for job ${job.id}:`,
          error
        );
      }
    }

    logger.warn(`Found ${futureJobs.length} future jobs scheduled`);

    for (const job of overdueJobs) {
      logger.info(`Executing overdue job: ${job.id}`);
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
          CantReg: 1,
          PtoVta: job.salePoint,
          CbteTipo: 11,
          Concepto: 1,
          DocTipo: 99,
          DocNro: 0,
          CbteFch: parseInt(
            new Date().toISOString().slice(0, 10).replace(/-/g, '')
          ),
          ImpTotal: job.valueToBill,
          ImpNeto: job.valueToBill,
          ImpIVA: 0,
          MonId: 'PES',
          MonCotiz: 1,
        });

        if (response) {
          logger.info('Factura generada CAE: ' + response.CAE);
          job.status = Status.Completed;
        } else {
          logger.error('Error al generar factura');
          job.status = Status.Failed;
        }

        await AppDataSource.getRepository(Jobs).save(job);
        logger.info(`Job ${job.id} executed successfully`);
      } catch (error) {
        job.status = Status.Failed;
        await AppDataSource.getRepository(Jobs).save(job);
        console.error(`Error executing overdue job ${job.id}`, error);
      }
    }

    // Schedule future jobs
    for (const job of futureJobs) {
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
      logger.info(`Scheduled future job: ${taskName} with expression: ${cron}`);
    }
  } catch (error) {
    console.error(`Error processing jobs:`, error);
  }
}

export { executePendingJobs };
