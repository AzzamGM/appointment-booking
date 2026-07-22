import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy backend/.env.example to backend/.env and adjust it.`,
    );
  }
  return value;
}

const NODE_ENV = process.env.NODE_ENV ?? 'development';

function originList(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export const env = {
  NODE_ENV,
  IS_PROD: NODE_ENV === 'production',
  IS_TEST: NODE_ENV === 'test',
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN_SECONDS: 60 * 60 * 24 * 7,
  CORS_ORIGINS: originList(),
  TRUST_PROXY_HOPS: Number(process.env.TRUST_PROXY_HOPS ?? 1),
};

if (env.IS_PROD && env.CORS_ORIGINS.length === 0) {
  throw new Error(
    'Missing CORS_ORIGINS in production. Set it to a comma-separated list of allowed ' +
      'frontend origins, e.g. CORS_ORIGINS="https://azzamgm.github.io".',
  );
}

if (env.IS_PROD && /change-me|dev-secret|test-secret/i.test(env.JWT_SECRET)) {
  throw new Error('JWT_SECRET is still set to a development placeholder. Set a real secret.');
}
