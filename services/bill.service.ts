import { scheduleRandomCronJobsForToday } from '../crons/dailyCron';
import { logger } from '../logger';
import { getUserById } from './user.service';
import { getUserCertificateAndKey } from './vault.service';
import { afipApiClient } from '../external/afipApiClient';

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
  async createSingleBill(
    userId: number,
    dateToBill: string,
    billNumber: string,
    valueToBill: number,
    dataToBill: Record<string, string | number>
  ) {
    try {
      logger.info('Creando facturas ' + billNumber + parseInt(billNumber));
      const user = await getUserById(userId);

      if (!user) {
        logger.error('No se pudo obtener el usuario');
        throw new Error('No se pudo obtener el usuario');
      }

      const { cert, key } = await getUserCertificateAndKey(userId);

      if (!cert || !key) {
        logger.error('No se pudo obtener el certificado y clave');
        throw new Error('No se pudo obtener el certificado y clave');
      }

      const fechaComprobante = new Date().toISOString().slice(0, 10).replace(/-/g, '');

      const response = await afipApiClient.createFacturaC({
        puntoVenta: user.salePoint!,
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

      return {
        CAE: response.data.cae,
        CAEFchVto: response.data.caeFchVto,
        voucher_number: response.data.numeroComprobante,
      };
    } catch (error) {
      logger.error(error);
      throw new Error('Error al crear factura');
    }
  },
};
