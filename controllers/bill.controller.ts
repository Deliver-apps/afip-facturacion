import { Request, Response, NextFunction } from 'express';
import { BillService } from '../services/bill.service';
import { logger } from '../logger';
import { AppDataSource } from '../data-source';
import { Jobs } from '../entities/Jobs.entity';
import { Status } from '../types/status.types';
import { getUserCertificateAndKey } from '../services/vault.service';
import { getUserById } from '../services/user.service';
import { afipApiClient } from '../external/afipApiClient';

export const BillController = {
  async createBillController(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, startDate, endDate, billNumber, minBill, maxBill } =
        req.body;

      const data = await BillService.createBill(
        userId,
        startDate,
        endDate,
        billNumber,
        minBill,
        maxBill
      );

      return res.status(201).json({
        message: 'Bill created successfully',
        data,
      });
    } catch (error: any) {
      logger.error(`Error in createBillController: ${error.message}`);
      return next(error); // Forward error to error-handling middleware
    }
  },

  async retryBillController(req: Request, res: Response, next: NextFunction) {
    const { jobId } = req.body;

    logger.warn('Retrying bill: ' + jobId);

    try {
      const job = await AppDataSource.getRepository(Jobs).findOne({
        where: { id: jobId },
      });

      if (!job) {
        return res.status(404).send('Job no encontrado');
      }

      if (job.status !== Status.Failed) {
        return res.status(400).send('Job no está en estado fallido');
      }

      const { cert, key } = await getUserCertificateAndKey(job.userId);
      const user = await getUserById(job.userId);

      if (!user) {
        return res.status(404).send('User not found');
      }

      const todayFormatted = new Date().toISOString().slice(0, 10).replace(/-/g, '');

      const response = await afipApiClient.createFacturaC({
        puntoVenta: job.salePoint,
        fechaComprobante: todayFormatted,
        importeTotal: job.valueToBill,
        cuitEmisor: user.username!,
        certificado: cert,
        clavePrivada: key,
      });

      if (response.success) {
        logger.info('Factura generada CAE: ' + response.data.cae + ' para: ' + job.id);
        job.status = Status.Completed;
        await AppDataSource.getRepository(Jobs).save(job);

        return res.status(201).json({
          message: 'Bill created successfully',
          data: {
            CAE: response.data.cae,
            CAEFchVto: response.data.caeFchVto,
            voucher_number: response.data.numeroComprobante,
          },
        });
      } else {
        logger.error('Error al generar factura: ' + response.message);
        job.status = Status.Failed;
        await AppDataSource.getRepository(Jobs).save(job);
        return res.status(500).json({
          message: 'Error al generar factura: ' + response.message,
        });
      }
    } catch (error: any) {
      logger.error(`Error in retryBillController: ${error}`);
      const job = await AppDataSource.getRepository(Jobs).findOne({
        where: { id: jobId },
      });

      if (!job) {
        return res.status(404).send('Job not found');
      }

      job.status = Status.Failed;
      await AppDataSource.getRepository(Jobs).save(job);
      logger.error(`Error in retryBillController: ${error}`);
      return next(error); // Forward error to error-handling middleware
    }
  },

  async createSingleBillController(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId, dateToBill, billNumber, valueToBill, dataToBill } =
        req.body;

      const data = await BillService.createSingleBill(
        userId,
        dateToBill,
        billNumber,
        valueToBill,
        dataToBill
      );

      return res.status(201).json({
        message: 'Bill created successfully',
        data,
      });
    } catch (error: any) {
      logger.error(`Error in createSingleBillController: ${error.message}`);
      return next(error); // Forward error to error-handling middleware
    }
  },
};
