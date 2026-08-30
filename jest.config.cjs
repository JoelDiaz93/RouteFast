module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\.spec\.ts$',
  transform: { '^.+\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: [
    'apps/order-service/src/**/*.(t|j)s',
    'apps/driver-service/src/**/*.(t|j)s',
    'apps/dispatch-service/src/**/*.(t|j)s',
    'apps/tracking-service/src/**/*.(t|j)s',
    '!apps/**/main.ts',
    '!apps/**/*.module.ts',
    '!apps/**/interfaces/**',
    '!apps/**/infrastructure/messaging/**'
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node'
};
