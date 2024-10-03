import cron from 'node-cron';
import { logger } from '../logger';
import { getAllUsers } from '../helpers/usersSupabase';
import { getUserCertificateAndKey } from '../services/vault.service';
import Afip from '@afipsdk/afip.js';
import { config } from '../config/config';

export function scheduleCronJobBill(
  cronExpression: string,
  taskName: string,
  valueToBill: number,
  salePoint: number,
  category: string
) {
  const task = cron.schedule(
    cronExpression,
    async () => {
      logger.info(
        `Executing cron job: ${taskName} at ${new Date().toLocaleString()}`
      );
      const users = await getAllUsers();
      users.forEach(async (user) => {
        const { cert, key } = await getUserCertificateAndKey(user.id);
        logger.info(`Certificate: ${cert}; Key: ${key}`);
        const afip = new Afip({
          CUIT: user.username,
          cert,
          key,
          production: true,
          access_token: config.afipSdkToken,
        });

        const comprobantesType = {
          A: 1,
          B: 6,
          C: 11,
        };

        type ComprobanteKey = keyof typeof comprobantesType;

        // Ensure 'category' is a valid key
        const comprobanteType = comprobantesType[category as ComprobanteKey];

        if (!comprobanteType) {
          throw new Error(`Invalid category: ${category}`);
        }

        const test = await afip.ElectronicBilling.getSalesPoints();
        const lastVoucher = await afip.ElectronicBilling.getLastVoucher(
          salePoint,
          comprobanteType
        );
        const data = {
          CantReg: 1, // The number of invoices to issue
          PtoVta: salePoint, // Point of sale number (the one you just created)
          CbteTipo: comprobanteType, // Type of document (11 for Electronic Billing)
          Concepto: 1, // Products
          DocTipo: 99, // Document type (99 for Consumidor Final)
          DocNro: 0, // Document number (0 for Consumidor Final)
          CbteFch: parseInt(
            new Date().toISOString().slice(0, 10).replace(/-/g, '')
          ), // Date in format YYYYMMDD
          ImpTotal: valueToBill, // Total amount
          ImpNeto: valueToBill, // Net amount
          ImpIVA: 0, // VAT amount
          MonId: 'PES', // Currency
          MonCotiz: 1, // Currency rate
        };

        const response = await afip.ElectronicBilling.createNextVoucher(data);
        logger.info(response);

        if (response) {
          logger.info('Factura generada' + response.CAE);
        } else {
          logger.error('Error al generar factura');
        }
      });
      task.stop();
      logger.warn(
        `Execution of cron job: ${taskName} completed at ${new Date().toLocaleString()}`
      );
    },
    {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires', // Set your timezone here
    }
  );
  logger.info(
    `Scheduled cron job: ${taskName} with expression: ${cronExpression}`
  );
}
