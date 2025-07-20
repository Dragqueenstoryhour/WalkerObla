/** @type {import('jest').Config} */
const config = {
  displayName: 'client',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.client.cjs'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  testMatch: ['<rootDir>/client/src/**/*.test.ts', '<rootDir>/client/src/**/*.test.tsx'],
  transform: {
    '^.+\.(ts|tsx)$': ['ts-jest', {
      tsconfig: './tsconfig.json',
      isolatedModules: true,
    }],
  },
};

module.exports = config;