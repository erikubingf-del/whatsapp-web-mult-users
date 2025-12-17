// Global test setup
import { PrismaClient } from '@prisma/client';

// Mock environment variables for testing
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'file:./test.db',
  NEXTAUTH_SECRET: 'test-secret-key-for-testing-only',
  NEXTAUTH_URL: 'http://localhost:3000',
});

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Global test utilities
export const createTestPrismaClient = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// Clean up after all tests
afterAll(async () => {
  // Clean up any global resources
});

// Console log suppression for cleaner test output (optional)
// Uncomment to suppress console logs during tests
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };
