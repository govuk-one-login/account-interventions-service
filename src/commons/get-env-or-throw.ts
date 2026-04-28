import logger from './logger';

const getEnvOrThrow = (name: string) => {
  const value = process.env[name];

  if (!value) {
    logger.error(`Environment variable ${name} not found`);
    throw new Error(`Environment variable ${name} not found`);
  }

  return value;
};

export default getEnvOrThrow;
