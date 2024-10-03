import * as brevo from '@getbrevo/brevo';
import { config } from './config';
export const apiInstanceEmail = new brevo.TransactionalEmailsApi();

apiInstanceEmail.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  config.smtpBrevo!
);

export const sendSmtpEmail = new brevo.SendSmtpEmail();

// sendSmtpEmail.subject = 'Prueba de envío de correo';
// sendSmtpEmail.to = [
//   {
//     email: 'cosmefacturita@gmail.com',
//   },
//   {
//     email: 'carlosjoelsalda@gmail.com',
//   },
// ];
// sendSmtpEmail.htmlContent = '<h1>Prueba de envío de correo</h1>';

// sendSmtpEmail.sender = {
//   name: 'Prueba de envío de correo',
//   email: 'carlosjoelsalda@gmail.com',
// };

// const result = apiInstance.sendTransacEmail(sendSmtpEmail).then(
//   (data) => {
//     console.log(data);
//   },
//   (error) => {
//     console.log(error);
//   }
// );
