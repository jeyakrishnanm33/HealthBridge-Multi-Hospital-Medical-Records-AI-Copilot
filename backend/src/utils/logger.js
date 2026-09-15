const env = require('../config/env');

const formatTime = () => new Date().toISOString();

const logger = {
  info: (message, meta = '') => {
    console.log(`[${formatTime()}] [INFO] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (message, meta = '') => {
    console.warn(`[${formatTime()}] [WARN] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message, error = '') => {
    console.error(`[${formatTime()}] [ERROR] ${message}`, error);
  },
  debug: (message, meta = '') => {
    if (env.NODE_ENV === 'development') {
      console.debug(`[${formatTime()}] [DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  },
};

module.exports = logger;
