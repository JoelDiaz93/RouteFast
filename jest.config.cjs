module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  collectCoverageFrom: [
    'apps/order-service/src/**/*.(t|j)s',
    '!apps/order-service/src/main.ts',
    '!apps/order-service/src/**/*.module.ts'
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node'
};
