// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!(jsondiffpatch)/)'
  ],
  moduleNameMapper: {
    '^jsondiffpatch$': '<rootDir>/node_modules/jsondiffpatch/lib/index.js'
  },
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ]
};
