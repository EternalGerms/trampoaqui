import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuração de níveis de log
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Cores para console
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(logColors);

// Determinar nível mínimo baseado em NODE_ENV
const getLogLevel = (): string => {
  const envLevel = process.env.LOG_LEVEL;
  if (envLevel) return envLevel;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
};

// Diretório de logs
const logDir = process.env.LOG_DIR || path.resolve(__dirname, '..', '..', 'logs');

// Formato para arquivos (JSON estruturado)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Formato para console (legível e colorido)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, source, ...metadata }) => {
    let msg = `${timestamp} [${level}]`;
    if (source) {
      msg += ` [${source}]`;
    }
    msg += ` ${message}`;
    
    // Adicionar metadata se existir
    if (Object.keys(metadata).length > 0) {
      const metaStr = JSON.stringify(metadata, null, 2);
      msg += `\n${metaStr}`;
    }
    
    return msg;
  })
);

// Configuração de rotação diária para arquivo principal
const dailyRotateFileTransport = new DailyRotateFile({
  filename: path.join(logDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: process.env.LOG_MAX_FILES || '14d',
  format: fileFormat,
  level: getLogLevel(),
  zippedArchive: true,
});

// Configuração de rotação diária para arquivo de erros
const dailyRotateErrorFileTransport = new DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: process.env.LOG_MAX_FILES || '14d',
  format: fileFormat,
  level: 'error',
  zippedArchive: true,
});

// Transporte para console
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: getLogLevel(),
});

// Criar instância do logger
const logger = winston.createLogger({
  levels: logLevels,
  level: getLogLevel(),
  format: fileFormat,
  transports: [
    dailyRotateFileTransport,
    dailyRotateErrorFileTransport,
    consoleTransport,
  ],
  // Não sair do processo em caso de erro
  exitOnError: false,
});

// Função helper para adicionar source aos logs
export const createLogger = (source: string) => {
  return {
    error: (message: string, metadata?: Record<string, any>) => {
      logger.error(message, { source, ...metadata });
    },
    warn: (message: string, metadata?: Record<string, any>) => {
      logger.warn(message, { source, ...metadata });
    },
    info: (message: string, metadata?: Record<string, any>) => {
      logger.info(message, { source, ...metadata });
    },
    debug: (message: string, metadata?: Record<string, any>) => {
      logger.debug(message, { source, ...metadata });
    },
  };
};

// Exportar logger padrão
export default logger;

// Exportar funções diretas para compatibilidade
export const logError = (message: string, metadata?: Record<string, any>) => {
  logger.error(message, metadata);
};

export const logWarn = (message: string, metadata?: Record<string, any>) => {
  logger.warn(message, metadata);
};

export const logInfo = (message: string, metadata?: Record<string, any>) => {
  logger.info(message, metadata);
};

export const logDebug = (message: string, metadata?: Record<string, any>) => {
  logger.debug(message, metadata);
};

