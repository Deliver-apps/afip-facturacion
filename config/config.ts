import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT,
  vaultAddress: process.env.VAULT_ADDRESS,
  vaultToken: process.env.VAULT_TOKEN,
  afipApiUrl: process.env.AFIP_API_URL ?? 'http://localhost:3002',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_API_KEY,
  supabaseAdminKey: process.env.SUPABASE_ADMIN_KEY,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom: process.env.SMTP_FROM,
  smtpBrevo: process.env.SMTP_BREVO,
  postgresHost: process.env.DB_HOST,
  postgresUser: process.env.DB_USERNAME,
  postgresPassword: process.env.DB_PASSWORD,
  postgresDatabase: process.env.DB_DATABASE,
  postgresPort: process.env.DB_PORT,
  postgresURL: process.env.DATABASE_URL,
};
