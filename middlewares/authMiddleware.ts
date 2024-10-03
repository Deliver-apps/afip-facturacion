import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../external/supabaseClient';
import { User } from '@supabase/supabase-js';
import { logger } from '../logger';

interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    logger.error('No token provided');
    return res.sendStatus(401);
  }

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      logger.error(error);
      return res.sendStatus(401);
    }
    req.user = user;
    next();
  } catch (error) {
    logger.error(error);
    return res.sendStatus(401);
  }
}
