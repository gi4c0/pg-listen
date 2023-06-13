module.exports = {
  moduleFileExtensions: [
    'ts',
    'js',
    'json'
  ],
  testEnvironment: 'node',
  rootDir: '.',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  bail: true,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']
};
