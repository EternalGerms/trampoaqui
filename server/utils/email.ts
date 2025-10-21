import nodemailer from 'nodemailer';
import crypto from 'crypto';

let transporter: nodemailer.Transporter;

function initializeTransporter() {
  const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    console.error(`❌ Email service is disabled. Missing required environment variables: ${missingVars.join(', ')}`);
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
  } catch (error) {
    console.error('❌ Failed to initialize email transporter:', error);
  }
}

// Initialize on startup
initializeTransporter();

export const sendVerificationEmail = async (email: string, token: string) => {
  if (!transporter) {
    console.error('Email transporter is not initialized. Cannot send verification email.');
    // Retornar em vez de lançar um erro, pois o envio de e-mail é opcional.
    return;
  }

  const verificationUrl = `http://localhost:5173/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verifique seu endereço de e-mail',
    html: `<p>Por favor, clique no link a seguir para verificar seu e-mail: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    // Não relançar o erro para não travar o registro
  }
};

export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};
