import { scheduleRandomCronJobsForToday } from '../crons/dailyCron';

import { logger } from '../logger';
import { getUserById } from './user.service';

export const BillService = {
  async createBill(
    userId: number,
    startDate: string,
    endDate: string,
    billNumber: string,
    minBill: number,
    maxBill: number
  ) {
    try {
      logger.info('Creando facturas ' + billNumber + parseInt(billNumber));
      const timesDivided =
        parseInt(billNumber) ?? Math.floor(Math.random() * (110 - 60 + 1)) + 60;
      const today = new Date();
      const user = await getUserById(userId);
      const startDay = startDate
        ? new Date(startDate).getDate()
        : today.getDate() + 1;
      const lastDayThisMonth = endDate
        ? new Date(endDate).getDate()
        : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - 3;

      scheduleRandomCronJobsForToday(
        7,
        23,
        minBill,
        maxBill,
        timesDivided,
        startDay,
        lastDayThisMonth,
        user?.username!,
        user?.category!,
        user?.salePoint!,
        user?.id!,
        user?.external_client!
      );

      // return crons;
      return;
    } catch (error) {
      logger.error(error);
      throw new Error('Error al obtener certificado y clave');
    }
  },
};
