import { Request, Response, NextFunction } from 'express';
import { BillService } from '../services/bill.service';
import { logger } from '../logger';
import { AppDataSource } from '../data-source';
import { Jobs } from '../entities/Jobs.entity';
import { Status } from '../types/status.types';
import { getUserCertificateAndKey } from '../services/vault.service';
import { getUserById } from '../services/user.service';
import Afip from '@afipsdk/afip.js';
import { config } from '../config/config';

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
        logger.info('Factura generada: ' + response.CAE + ' para: ' + job.id);
      } else {
        logger.error('Error al generar factura');
        job.status = Status.Failed;
        await AppDataSource.getRepository(Jobs).save(job);
        return res.status(500).json({
          message: 'Error al generar factura',
        });
      }
      job.status = Status.Completed;
      await AppDataSource.getRepository(Jobs).save(job);

      return res.status(201).json({
        message: 'Bill created successfully',
      });
    } catch (error: any) {
      const job = await AppDataSource.getRepository(Jobs).findOne({
        where: { id: jobId },
      });

      if (!job) {
        return res.status(404).send('Job not found');
      }

      job.status = Status.Failed;
      await AppDataSource.getRepository(Jobs).save(job);
      logger.error(`Error in retryBillController: ${error.message}`);
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
