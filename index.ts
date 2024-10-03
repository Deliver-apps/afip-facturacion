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
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import userRouter from './routes/user.router';
import { getUserCertificateAndKey } from './services/vault.service';
import { getAllUsers } from './helpers/usersSupabase';
import { router } from './routes/index';
import { generateRandomCronTimes } from './helpers/cronRandomized';
import { cronToTime } from './helpers/parsedCron';

const app = express();
const PORT = config.port ?? 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use('/api', router);

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
  const { min, max, totalParts, initDate, endDate, cuit, userId } = req.body;

  const randomNumber = getRandomNumberBetween(min, max);

  // Divide the random number into N parts
  const parts = divideNumberRandomly(randomNumber, totalParts);

  // Calculate the total
  const total = sumParts(parts);
  const randomCrons = generateRandomCronTimes(
    totalParts,
    9,
    21,
    initDate,
    endDate
  );
  const datesFromCron = randomCrons
    .map((time) => {
      const stringTime = cronToTime(time);
      return stringTime;
    })
    .filter((time) => time !== null);

  const { cert, key } = await getUserCertificateAndKey(userId);
  const afip = new Afip({
    CUIT: cuit,
    cert,
    key,
    production: true,
    access_token: config.afipSdkToken,
  });

  const test = await afip.ElectronicBilling.getSalesPoints();

  res.send({
    randomNumber,
    parts,
    randomCrons,
    total,
    datesFromCron,
    afip: afip.CUIT,
    sale: test,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
