import { AppDataSource } from '../data-source';
import { Jobs } from '../entities/Jobs.entity';
import { logger } from '../logger';
import { Status } from '../types/status.types';
import parser from 'cron-parser';
import moment from 'moment-timezone';
import { getUserCertificateAndKey } from '../services/vault.service';
import { getUserById } from '../services/user.service';
import { scheduleCronJobBill } from './cronGenerator';
import { afipApiClient } from '../external/afipApiClient';

async function executePendingJobs() {
  try {
    const getPendingJobs = await AppDataSource.getRepository(Jobs).find({
      where: { status: Status.Pending },
    });

    logger.warn(`Found ${getPendingJobs.length} pending jobs`);

    const timezone = 'America/Argentina/Buenos_Aires';
    const now = moment.tz(new Date(), timezone);

    // Identify Overdue Jobs - jobs that should have already run
    const overdueJobs: Jobs[] = [];
    for (const job of getPendingJobs) {
      try {
        const interval = parser.parseExpression(job.cronExpression, {
          tz: timezone,
          currentDate: now.toDate(),
        });

        // Check if there was a previous execution time that should have happened
        let prevExecutionTime;
        try {
          prevExecutionTime = moment.tz(interval.prev().toDate(), timezone);
          
          // If the previous execution time is after job creation and before now,
          // and the job is still pending, it's overdue
          if (
            prevExecutionTime.isAfter(moment(job.createdAt)) &&
            prevExecutionTime.isBefore(now)
          ) {
            overdueJobs.push(job);
          }
        } catch (e) {
          // If we can't find a previous execution, the job hasn't had a past run
          // This usually means it's scheduled for the future, so not overdue
          logger.debug(`Job ${job.id} has no previous execution time - likely future scheduled`);
        }
      } catch (error) {
        logger.error(
          `Error parsing cron expression for job ${job.id}:`,
          error
        );
      }
    }

    logger.warn(
      `Found ${overdueJobs.length} jobs that are overdue and need immediate execution`
    );
    logger.warn(`Total jobs: ${getPendingJobs.length}`);

    // Execute overdue jobs immediately
    for (const job of overdueJobs) {
      logger.info(`Executing overdue job: ${job.id}`);
      try {
        const { cert, key } = await getUserCertificateAndKey(job.userId);
        const user = await getUserById(job.userId);

        if (!user) {
          logger.error(`User not found for job ${job.id}`);
          job.status = Status.Failed;
          await AppDataSource.getRepository(Jobs).save(job);
          continue;
        }

        const fechaComprobante = new Date().toISOString().slice(0, 10).replace(/-/g, '');

        const response = await afipApiClient.createFacturaC({
          puntoVenta: job.salePoint,
          fechaComprobante,
          importeTotal: job.valueToBill,
          cuitEmisor: user.username!,
          certificado: cert,
          clavePrivada: key,
        });

        if (response.success) {
          logger.info('Factura generada CAE: ' + response.data.cae);
          job.status = Status.Completed;
        } else {
          logger.error('Error al generar factura: ' + response.message);
          job.status = Status.Failed;
        }

        await AppDataSource.getRepository(Jobs).save(job);
        logger.info(`Job ${job.id} executed successfully`);
      } catch (error) {
        job.status = Status.Failed;
        await AppDataSource.getRepository(Jobs).save(job);
        logger.error(`Error executing overdue job ${job.id}:`, error);
      }
    }

    // Identify Future Jobs
    const futureJobs = [];
    for (const job of getPendingJobs) {
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
        logger.error(
          `Error parsing cron expression for job ${job.id}:`,
          error
        );
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

    logger.info(`Job processing completed. Executed ${futureJobs.length} overdue jobs.`);
  } catch (error) {
    logger.error(`Error processing jobs:`, error);
  }
}

export { executePendingJobs };
