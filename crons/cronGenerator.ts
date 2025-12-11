import cron from 'node-cron';
import { logger } from '../logger';
import { getUserCertificateAndKey } from '../services/vault.service';
import { getUserById } from '../services/user.service';
import { AppDataSource } from '../data-source';
import { Status } from '../types/status.types';
import { Jobs } from '../entities/Jobs.entity';
import { afipApiClient } from '../external/afipApiClient';

export function scheduleCronJobBill(
  cronExpression: string,
  taskName: string,
  valueToBill: number,
  salePoint: number,
  category: string,
  userId: number,
  jobId: number // Pass the `jobId` directly when scheduling the job
) {
  const task = cron.schedule(
    cronExpression,
    async () => {
      logger.info(
        `Executing cron job: ${taskName} at ${new Date()}, to userId: ${userId}`
      );

      try {
        if (jobId) {
          const job = await AppDataSource.getRepository(Jobs).findOne({
            where: { id: jobId },
          });

          if (!job || job.status === Status.Completed) {
            throw new Error('No se pudo obtener el job o ya fue ejecutado');
          }

          const user = await getUserById(userId);
          const { cert, key } = await getUserCertificateAndKey(userId);

          if (!cert || !key) {
            logger.error('No se pudo obtener el certificado y clave');
            throw new Error('No se pudo obtener el certificado y clave');
          }

          if (!user) {
            logger.error('No se pudo obtener el usuario');
            throw new Error('No se pudo obtener el usuario');
          }

          const fechaComprobante = new Date().toISOString().slice(0, 10).replace(/-/g, '');

          const response = await afipApiClient.createFacturaC({
            puntoVenta: salePoint,
            fechaComprobante,
            importeTotal: valueToBill,
            cuitEmisor: user.username!,
            certificado: cert,
            clavePrivada: key,
          });

          if (!response.success) {
            logger.error('Error al generar factura: ' + response.message);
            throw new Error(response.message);
          }

          logger.info('Factura generada CAE: ' + response.data.cae);

          await AppDataSource.transaction(async (manager) => {
            const getJob = await manager
              .getRepository(Jobs)
              .findOne({ where: { id: jobId } });
            if (!getJob) {
              throw new Error('No se pudo obtener el job');
            }
            getJob.status = Status.Completed;
            await manager.save(getJob);
          });
        }
      } catch (error) {
        await AppDataSource.transaction(async (manager) => {
          const getJob = await manager
            .getRepository(Jobs)
            .findOne({ where: { id: jobId } });
          if (!getJob) {
            throw new Error('No se pudo obtener el job');
          }
          getJob.status = Status.Failed;
          await manager.save(getJob);
        });
        console.error(error);
      }

      task.stop();
      logger.warn(
        `Execution of cron job: ${taskName} completed at ${new Date().toLocaleString()}`
      );
    },
    {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires',
    }
  );
  logger.info(
    `Scheduled cron job: ${taskName} with expression: ${cronExpression}`
  );
}
