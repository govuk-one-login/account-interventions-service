export function getEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Environment variable ${name} not found`);
  }
  return value;
};
