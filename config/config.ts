import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT,
  vaultAddress: process.env.VAULT_ADDRESS,
  vaultToken: process.env.VAULT_TOKEN,
  afipSdkToken: process.env.AFIP_SDK_TOKEN,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_API_KEY,
  supabaseAdminKey: process.env.SUPABASE_ADMIN_KEY,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom: process.env.SMTP_FROM,
  smtpBrevo: process.env.SMTP_BREVO,
};
