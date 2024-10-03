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

async function executePendingJobs() {
  const todayGetDay = new Date().getDate();
  const todayGetHour = new Date().getHours();
  const todayGetMinute = new Date().getMinutes();

  const getPendingJobs = await AppDataSource.getRepository(Jobs).find({
    where: { status: Status.Pending },
  });

  const currentDate = new Date();

  const timezone = 'America/Argentina/Buenos_Aires';

  const filteredJobsToRun = getPendingJobs.filter((job) => {
    try {
      const buenosAiresNow = moment.tz(new Date(), timezone);
      const startOfCurrentMonth = buenosAiresNow.clone().startOf('month');

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

      // Check if the last execution is on or after the start of the current month
      if (lastExecutionMoment.isSameOrAfter(startOfCurrentMonth)) {
        // Include the job
        return true;
      } else {
        // Exclude the job
        return false;
      }
    } catch (error) {
      console.error(`Error parsing cron expression for job ${job.id}:`, error);
      return false; // Exclude the job on error
    }
  });

  for (const job of filteredJobsToRun) {
    logger.info(`Executing job: ${job.id}`);
    const { cert, key } = await getUserCertificateAndKey(job.userId);
    const user = await getUserById(job.userId);

    const afip = new Afip({
      CUIT: user?.username,
      cert,
      key,
      production: true,
      access_token: config.afipSdkToken,
    });

    const lastVoucher = await afip.ElectronicBilling.getLastVoucher(
      job.salePoint,
      11
    );

    // const response = await afip.ElectronicBilling.createNextVoucher({
    //   CantReg: 1, // The number of invoices to issue
    //   PtoVta: job.salePoint, // Point of sale number (the one you just created)
    //   CbteTipo: 11, // Type of document (11 for Electronic Billing)
    //   Concepto: 1, // Products
    //   DocTipo: 99, // Document type (99 for Consumidor Final)
    //   DocNro: 0, // Document number (0 for Consumidor Final)
    //   CbteFch: parseInt(
    //     new Date().toISOString().slice(0, 10).replace(/-/g, '')
    //   ), // Date in format YYYYMMDD
    //   ImpTotal: job.valueToBill, // Total amount
    //   ImpNeto: job.valueToBill, // Net amount
    //   ImpIVA: 0, // VAT amount
    //   MonId: 'PES', // Currency
    //   MonCotiz: 1, // Currency rate
    // });

    // if (response) {
    //   logger.info('Factura generada' + response.CAE);
    // } else {
    //   logger.error('Error al generar factura');
    // }
    job.status = Status.Completed;
    await AppDataSource.getRepository(Jobs).save(job);
    logger.info(`Job ${job.id} executed successfully`);
  }
}

export { executePendingJobs };
