import cron from 'node-cron';
import { logger } from '../logger';
import { getAllUsers } from '../helpers/usersSupabase';
import { getUserCertificateAndKey } from '../services/vault.service';
import Afip from '@afipsdk/afip.js';
import { config } from '../config/config';
import { getUserById } from '../services/user.service';
import { AppDataSource } from '../data-source';
import { Status } from '../types/status.types';
import { Jobs } from '../entities/Jobs.entity';

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
        const user = await getUserById(userId);
        const { cert, key } = await getUserCertificateAndKey(userId);

        if (!cert || !key) {
          logger.error('No se pudo obtener el certificado y clave');
          throw new Error('No se pudo obtener el certificado y clave');
        }

        const afip = new Afip({
          CUIT: user?.username,
          cert,
          key,
          production: true,
          access_token: config.afipSdkToken,
        });

        const data = {
          CantReg: 1,
          PtoVta: salePoint,
          CbteTipo: 11,
          Concepto: 1,
          DocTipo: 99,
          DocNro: 0,
          CbteFch: parseInt(
            new Date().toISOString().slice(0, 10).replace(/-/g, '')
          ),
          ImpTotal: valueToBill,
          ImpNeto: valueToBill,
          ImpIVA: 0,
          MonId: 'PES',
          MonCotiz: 1,
        };

        let response = await afip.ElectronicBilling.createNextVoucher(data);

        if (!response) {
          logger.error('Error al generar factura');
          console.error(response);
        }

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
