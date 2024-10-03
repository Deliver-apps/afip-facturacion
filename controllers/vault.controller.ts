import { Request, Response } from 'express';
import {
  loadUserCertificateAndKey,
  getUserCertificateAndKey,
} from '../services/vault.service';
import { logger } from '../logger';

export const loadCertificateController = async (
  req: Request,
  res: Response
) => {
  const { userId, key, cert } = req.body;
  logger.info(JSON.stringify(req.body));

  if (!userId || !key || !cert) {
    return res.status(400).send('Missing parameters');
  }

  try {
    await loadUserCertificateAndKey(userId, key, cert);
    return res.status(200).send('Certificate loaded');
  } catch (error: any) {
    logger.error(`Error writing to Vault: ${error.message}`);
    return res.status(500).send(error.message);
  }
};

export const getCertificateController = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdNumber = parseInt(userId);
    if (!userIdNumber) {
      return res.status(400).send('Invalid userId');
    }
    const certificate = await getUserCertificateAndKey(userIdNumber);
    return res.status(200).json(certificate);
  } catch (error: any) {
    logger.error(`Error reading from Vault: ${error.message}`);
    return res.status(500).send(error.message);
  }
};
