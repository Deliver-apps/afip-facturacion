import { Request, Response, NextFunction } from 'express';
import { BillService } from '../services/bill.service';
import { logger } from '../logger';

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
};
