// test/setup-e2e.ts
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

export default async function globalSetup() {
  // Load environment variables from a .env.test file if it exists, otherwise from .env
  dotenv.config({ path: '.env.test' });
  if (!process.env.DATABASE_URL) {
    dotenv.config(); // Load from .env if .env.test doesn't exist or DATABASE_URL is not set
  }

  // Ensure DATABASE_URL is set for e2e tests
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('soiltech')) {
    process.env.DATABASE_URL = 'postgresql://soiltech:soiltech@localhost:5432/soiltech_e2e_test?schema=public';
  }
  process.env.NODE_ENV = 'test';
  console.log('e2e globalSetup: process.env.DATABASE_URL set to', process.env.DATABASE_URL);

  try {
    console.log('Bringing up Docker Compose services...');
    execSync('docker compose up -d', { stdio: 'inherit' });
    console.log('Waiting for database to be ready (5 seconds)...');
    execSync('sleep 5'); // Simple delay, in real world use a more robust health check

    console.log('Resetting test database...');
    const consentEnv = { ...process.env, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes' };
    execSync('npx prisma migrate reset --force', { stdio: 'inherit', env: consentEnv });
    console.log('Generating Prisma client for test environment...');
    execSync('npx prisma generate', { stdio: 'inherit', env: consentEnv });
    console.log('Test database setup complete.');
  } catch (error) {
    console.error('Failed to set up test database:', error);
    // Optionally, bring down Docker services on error
    execSync('docker compose down', { stdio: 'inherit' });
    process.exit(1);
  }
}
