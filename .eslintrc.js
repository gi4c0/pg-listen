module.exports = {
  'env': {
    'browser': true,
    'es2021': true
  },
  'extends': [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  'overrides': [
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaVersion': 'latest',
    'sourceType': 'module'
  },
  'plugins': [
    '@typescript-eslint'
  ],
  'rules': {
    // '@typescript-eslint/type-annotation-spacing': 'error', // Do not use for formatting
    '@typescript-eslint/unified-signatures': 'error',
    'eqeqeq': 'error',
    'radix': ['error', 'always'],
    'prefer-const': 'error',
    'brace-style': 'error',
    'no-use-before-define': 'off',
    /*
     * '@typescript-eslint/no-use-before-define': ['error', {
     *   'functions': false,
     *   'enums': false
     * }],
     */
    'no-undef-init': 'error',
    'no-unused-expressions': 'error',
    'no-throw-literal': 'error',
    'no-trailing-spaces': 'error',
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',
    'no-eval': 'error',
    'no-debugger': 'error',
    '@typescript-eslint/no-empty-interface': 'error',
    'no-bitwise': 'error',
    'no-caller': 'error',
    'no-console': ['error', { 'allow': ['error', 'log'] }],
    'no-multiple-empty-lines': ['error', { max: 1 }],
    'no-new-wrappers': 'error',
    '@typescript-eslint/member-ordering': [
      'error',
      {
        'default': [
          'public-static-field',
          'protected-static-field',
          'private-static-field',
          'public-static-method',
          'protected-static-method',
          'private-static-method',
          'public-instance-field',
          'protected-instance-field',
          'private-instance-field',
          'public-instance-method',
          'protected-instance-method',
          'private-instance-method'
        ]
      }
    ],
    '@typescript-eslint/explicit-member-accessibility': ['error', 'always'],
    'no-labels': ['error', { 'allowLoop': true }],
    'object-curly-spacing': ['error', 'always'],
    'guard-for-in': 'error',
    'eol-last': ['error', 'always'], // Does not work
    'curly': ['error', 'all'],
    'capitalized-comments': ['error', 'always'],
    'spaced-comment': ['error', 'always'],
    'comma-dangle': ['error', {
      'arrays': 'never',
      'objects': 'never',
      'imports': 'never',
      'exports': 'never',
      'functions': 'never'
    }],
    'max-len': ['warn', { 'code': 160 }],
    '@typescript-eslint/no-empty-function': 'off',
    'no-constant-condition': ['error', { 'checkLoops': false }],
    'no-case-declarations': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '_', 'ignoreRestSiblings': true }],
    '@typescript-eslint/ban-types': ['error', { 'types': { 'Function': false, '{}': false } }],
    'no-useless-escape': 'off',
    'no-prototype-builtins': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-empty': 'off',
    'no-extra-boolean-cast': 'off',
    'quotes': ['error', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/array-type': ['error', { 'default': 'generic', 'readonly': 'generic' }],
    'indent': [
      'error',
      2
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'semi': [
      'error',
      'always'
    ]
  }
};

