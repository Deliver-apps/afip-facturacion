import 'reflect-metadata';
import Afip from '@afipsdk/afip.js';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import { readFileSync } from 'fs';
import { logger } from './logger';
import {
  divideNumberRandomly,
  getRandomNumberBetween,
  sumParts,
} from './helpers/randomized';
import { config } from './config/config';
import { getVaultClient } from './external/vaultClient';
import vaultRoutes from './routes/vault.router';
import facturacionRouter from './routes/facturacion.router';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import userRouter from './routes/user.router';
import { getUserCertificateAndKey } from './services/vault.service';
import { getAllUsers } from './helpers/usersSupabase';
import { router } from './routes/index';
import { generateRandomCronTimes } from './helpers/cronRandomized';
import { cronToTime } from './helpers/parsedCron';
import { AppDataSource } from './data-source';
import { Status } from './types/status.types';
import { Jobs } from './entities/Jobs.entity';
import { executePendingJobs } from './crons/handlerJobs';
import axios from 'axios';

const app = express();
const PORT = config.port ?? 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Place error-handling middleware at the end
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`);

  if (res.headersSent) {
    // If headers are already sent, delegate to the default Express error handler
    return next(err);
  }

  // Customize the error response as needed
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 300, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again after 15 minutes',
// });

// app.use(limiter);
//

app.post('/billC', async (req: Request, res: Response) => {
  logger.info('billed');
  const { min, max, totalParts, initDate, endDate, cuit, userId, salePoint } =
    req.body;

  const randomNumber = getRandomNumberBetween(min, max);

  // Divide the random number into N parts
  let parts: number[] = [];
  try {
    parts = divideNumberRandomly(randomNumber, totalParts);
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .send('Error dividiendo el numero aleatorio' + error.message);
  }

  // Calculate the total
  const total = sumParts(parts);
  const randomCrons = generateRandomCronTimes(
    totalParts,
    9,
    21,
    initDate,
    endDate
  );

  const cuitToOnlyNumbers = cuit.replace(/-/g, '');
  const datesFromCron = randomCrons
    .map((time) => {
      const stringTime = cronToTime(time);
      return stringTime;
    })
    .filter((time) => time !== null);

  const { cert, key } = await getUserCertificateAndKey(userId);
  const afip = new Afip({
    CUIT: cuitToOnlyNumbers,
    cert,
    key,
    production: true,
    access_token: config.afipSdkToken,
  });

  let salesPoints;
  try {
    salesPoints = await afip.ElectronicBilling.getSalesPoints();
  } catch (error) {
    console.error(JSON.stringify(error));
  }

  const soapXML = `
     <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
     xmlns:a5="http://a5.soap.ws.server.puc.sr/">
       <soapenv:Header/>
       <soapenv:Body>
         <a5:dummy/>
       </soapenv:Body>
     </soapenv:Envelope>
   `;

  const soapURL =
    'https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA5?WSDL';

  try {
    const response = await axios.post(soapURL, soapXML, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '', // Incluye tu acción SOAP si es requerida
      },
    });

    console.log('Respuesta del servidor:', response.data);
  } catch (error) {
    console.error('Error al realizar la solicitud SOAP:', error);
  }

  res.send({
    randomNumber,
    parts,
    randomCrons,
    total,
    datesFromCron,
    afip: afip.CUIT,
    salesPoints,
  });
});
AppDataSource.initialize()
  .then(async () => {
    console.log('DataSource is connected');
    await AppDataSource.query("SET TIME ZONE 'America/Argentina/Buenos_Aires'");

    app.use('/api', router);
    app.use('/api', userRouter);
    app.use('/api', vaultRoutes);
    app.use('/api', facturacionRouter);

    //executePendingJobs();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => console.log(error));
