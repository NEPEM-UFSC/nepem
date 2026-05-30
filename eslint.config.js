const globals = require('globals');

module.exports = [
  {
    ignores: ['data/**', 'img/**', 'node_modules/**', '.github/**'],
  },
  {
    files: ['server.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: globals.browser,
    },
  },
];
