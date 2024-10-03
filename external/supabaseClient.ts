import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase'; // Import generated type
import { config } from '../config/config';
import { logger } from '../logger';

const supabaseUrl = (config.supabaseUrl as string) ?? '';
const supabaseKey = (config.supabaseKey as string) ?? '';
const supabaseAdminKey = config.supabaseAdminKey ?? '';
export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseAdminKey
);
