/** @type {import('jest').Config} */
const config = {
  displayName: 'server',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.server.cjs'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  testMatch: ['<rootDir>/server/**/*.test.ts'],
  transform: {
    '^.+\.(ts|tsx)$': ['ts-jest', {
      tsconfig: './tsconfig.json',
      isolatedModules: true,
    }],
  },
};

module.exports = config;