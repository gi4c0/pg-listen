const baseConfig = require('./jest.config');
baseConfig.testRegex = '\\.itest\\.ts$';
console.log('Starting integration tests');
module.exports = baseConfig;
