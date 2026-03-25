const getEnvOrThrow = (name: string) => {
  const value = process.env[name];

  if (!value) throw new Error(`Environment variable ${name} not found`);

  return value;
};

export default getEnvOrThrow;
