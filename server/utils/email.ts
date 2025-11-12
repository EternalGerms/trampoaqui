import nodemailer from 'nodemailer';
import crypto from 'crypto';

let transporter: nodemailer.Transporter;
const DEFAULT_FRONTEND_URL = 'http://localhost:5173';
const APP_URL =
  process.env.FRONTEND_URL ||
  process.env.APP_URL ||
  DEFAULT_FRONTEND_URL;
const APP_NAME = process.env.APP_NAME || 'TrampoAqui';

function initializeTransporter() {
  const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);

  // Debug: log which variables are available
  console.log('📧 Email configuration check:');
  requiredEnvVars.forEach(v => {
    const value = process.env[v];
    if (value) {
      // Mask sensitive values
      const maskedValue = v.includes('PASS') || v.includes('SECRET') 
        ? '***' + value.slice(-3) 
        : value;
      console.log(`  ✅ ${v}: ${maskedValue}`);
    } else {
      console.log(`  ❌ ${v}: not set`);
    }
  });

  if (missingVars.length > 0) {
    console.error(`❌ Email service is disabled. Missing required environment variables: ${missingVars.join(', ')}`);
    console.error(`💡 Make sure these variables are set in your .env file and the container has been restarted.`);
    return;
  }

  try {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log('✅ Email transporter initialized successfully');
    console.log(`📧 Email will be sent from: ${process.env.EMAIL_FROM}`);
    console.log(`🌐 Frontend URL: ${APP_URL}`);
  } catch (error) {
    console.error('❌ Failed to initialize email transporter:', error);
  }
}

// Initialize on startup
initializeTransporter();

export const sendVerificationEmail = async (email: string, token: string): Promise<boolean> => {
  if (!transporter) {
    console.error('Email transporter is not initialized. Cannot send verification email.');
    return false;
  }

  const normalizedAppUrl = APP_URL.replace(/\/$/, '');
  const verificationUrl = `${normalizedAppUrl}/verify-email?token=${token}`;

  const subject = `${APP_NAME} - Verifique seu endereço de e-mail`;
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f4f5f7;padding:24px 0;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 10px 25px rgba(15,23,42,0.1);">
                <tr>
                  <td style="padding:40px 24px 32px 24px;">
                    <p style="margin:0 0 16px;font-size:16px;color:#0f172a;">Olá,</p>
                    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#334155;">
                      Recebemos uma solicitação para criar uma conta em <strong>${APP_NAME}</strong> usando este endereço de e-mail.
                      Para confirmar e ativar sua conta, clique no botão abaixo:
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                      <tr>
                        <td style="background-color:#2563eb;border-radius:8px;">
                          <a href="${verificationUrl}"
                            style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#f8fafc;text-decoration:none;"
                            target="_blank" rel="noopener noreferrer">
                            Confirmar e-mail
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#64748b;">
                      Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:
                    </p>
                    <p style="margin:0 0 24px;font-size:14px;line-height:1.5;word-break:break-all;color:#1d4ed8;">
                      <a href="${verificationUrl}" style="color:#1d4ed8;text-decoration:none;" target="_blank" rel="noopener noreferrer">${verificationUrl}</a>
                    </p>
                    <p style="margin:0 0 16px;font-size:14px;color:#94a3b8;">
                      Este link expira em 1 hora. Se você não solicitou este cadastro, pode ignorar este e-mail.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#f8fafc;padding:16px 24px;text-align:center;">
                    <p style="margin:0;font-size:13px;color:#94a3b8;">
                      &copy; ${new Date().getFullYear()} ${APP_NAME}. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject,
    html: htmlContent,
    text: [
      `${APP_NAME} - Confirme seu endereço de e-mail`,
      '',
      'Olá,',
      '',
      `Para confirmar sua conta em ${APP_NAME}, acesse o link abaixo:`,
      verificationUrl,
      '',
      'Este link expira em 1 hora. Se você não realizou esta solicitação, desconsidere este e-mail.',
    ].join('\n'),
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    return false;
  }
};

export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};
