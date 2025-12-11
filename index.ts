import 'reflect-metadata';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { config } from './config/config';
import vaultRoutes from './routes/vault.router';
import facturacionRouter from './routes/facturacion.router';
import morgan from 'morgan';
import userRouter from './routes/user.router';
import { getUserCertificateAndKey } from './services/vault.service';
import { router } from './routes/index';
import { AppDataSource } from './data-source';
import { executePendingJobs } from './crons/handlerJobs';
import { getUserByUsername } from './services/user.service';
import { afipApiClient } from './external/afipApiClient';

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

app.get('/billC', async (req: Request, res: Response) => {
  logger.info('billed');
  const cuit = req.query.username as string;

  if (!cuit) {
    res.status(400).send({
      success: false,
      message: 'Missing parameters',
    });
    return;
  }

  const getUser = await getUserByUsername(cuit);

  if (!getUser) {
    res.status(400).send({
      success: false,
      message: 'User not found',
    });
    return;
  }

  const cuitToOnlyNumbers = cuit.replace(/-/g, '');

  try {
    const { cert, key } = await getUserCertificateAndKey(getUser.id);

    const salesPointsResponse = await afipApiClient.getSalesPoints({
      cuitEmisor: cuitToOnlyNumbers,
      certificado: cert,
      clavePrivada: key,
    });

    if (!salesPointsResponse.success || !salesPointsResponse.data?.length) {
      res.status(400).send({
        success: false,
        message: 'No sales points found',
      });
      return;
    }

    res.status(200).send({
      status: 'success',
    });
  } catch (error) {
    console.error(JSON.stringify(error));
    res.status(500).send({
      success: false,
      message: 'Error en la conexión con AFIP API',
    });
    return;
  }
});
AppDataSource.initialize()
  .then(async () => {
    console.log('DataSource is connected');
    await AppDataSource.query("SET TIME ZONE 'America/Argentina/Buenos_Aires'");

    app.use('/api', router);
    app.use('/api', userRouter);
    app.use('/api', vaultRoutes);
    app.use('/api', facturacionRouter);

    // executePendingJobs();

    app.listen(3000, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => console.log(error));
