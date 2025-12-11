import axios, { AxiosInstance } from 'axios';
import { config } from '../config/config';
import { logger } from '../logger';

interface InvoiceRequest {
  puntoVenta: number;
  tipoComprobante: number;
  fechaComprobante: string;
  cuitCliente: string;
  tipoDocumento: number;
  condicionIvaReceptor: number;
  concepto: number;
  importeNetoGravado: number;
  importeIva: number;
  importeTotal: number;
  monedaId?: string;
  cotizacionMoneda?: number;
  cuitEmisor: string;
  certificado: string;
  clavePrivada: string;
}

interface InvoiceResponse {
  data: {
    cae: string;
    caeFchVto: string;
    puntoVenta: number;
    tipoComprobante: number;
    numeroComprobante: number;
    fechaComprobante: string;
    importeTotal: number;
    resultado: string;
    codigoAutorizacion: string;
    cuitEmisor: string;
    tipoDocReceptor: number;
    nroDocReceptor: string;
    qrData?: {
      ver: number;
      fecha: string;
      cuit: string;
      ptoVta: number;
      tipoCmp: number;
      nroCmp: number;
      importe: number;
      moneda: string;
      ctz: number;
      tipoDocRec: number;
      nroDocRec: string;
      tipoCodAut: string;
      codAut: string;
      url: string;
    };
  };
  success: boolean;
  message: string;
  timestamp: string;
}

interface SalesPointsRequest {
  cuitEmisor: string;
  certificado: string;
  clavePrivada: string;
}

interface StatusResponse {
  status: string;
  environment: string;
  isProduction: boolean;
  urls: {
    wsaa: string;
    wsfe: string;
  };
  warning: string;
}

class AfipApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.afipApiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Create a Factura C (Monotributista) invoice
   * tipoComprobante: 11 for Factura C
   */
  async createFacturaC(params: {
    puntoVenta: number;
    fechaComprobante: string;
    importeTotal: number;
    cuitEmisor: string;
    certificado: string;
    clavePrivada: string;
    condicionIvaReceptor?: number;
  }): Promise<InvoiceResponse> {
    const requestData: InvoiceRequest = {
      puntoVenta: params.puntoVenta,
      tipoComprobante: 11, // Factura C
      fechaComprobante: params.fechaComprobante,
      cuitCliente: '0',
      tipoDocumento: 99, // Consumidor Final
      condicionIvaReceptor: params.condicionIvaReceptor ?? 5, // Consumidor Final
      concepto: 1, // Products
      importeNetoGravado: params.importeTotal,
      importeIva: 0, // Monotributista doesn't charge IVA
      importeTotal: params.importeTotal,
      monedaId: 'PES',
      cotizacionMoneda: 1,
      cuitEmisor: params.cuitEmisor,
      certificado: params.certificado,
      clavePrivada: params.clavePrivada,
    };

    try {
      const response = await this.client.post<InvoiceResponse>(
        '/afip/invoice',
        requestData
      );
      return response.data;
    } catch (error: any) {
      logger.error(`Error creating Factura C: ${error.message}`);
      if (error.response) {
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Get sales points for a given CUIT
   */
  async getSalesPoints(params: SalesPointsRequest): Promise<any> {
    try {
      const response = await this.client.post(
        '/afip/puntos-venta',
        params
      );
      return response.data;
    } catch (error: any) {
      logger.error(`Error getting sales points: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get API status and environment info
   */
  async getStatus(): Promise<StatusResponse> {
    try {
      const response = await this.client.get<StatusResponse>(
        '/afip/status'
      );
      return response.data;
    } catch (error: any) {
      logger.error(`Error getting API status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get last authorized invoice number
   */
  async getLastAuthorized(params: {
    puntoVenta: number;
    tipoComprobante: number;
    cuitEmisor: string;
    certificado: string;
    clavePrivada: string;
  }): Promise<any> {
    try {
      const response = await this.client.post('/afip/ultimo-autorizado', {
        puntoVenta: params.puntoVenta,
        tipoComprobante: params.tipoComprobante,
        cuitEmisor: params.cuitEmisor,
        certificado: params.certificado,
        clavePrivada: params.clavePrivada,
      });
      return response.data;
    } catch (error: any) {
      logger.error(`Error getting last authorized: ${error.message}`);
      throw error;
    }
  }
}

export const afipApiClient = new AfipApiClient();
