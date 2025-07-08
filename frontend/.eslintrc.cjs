/**
 * ESLint configuration for the frontend project.
 *
 * This configuration sets up linting rules for JavaScript and TypeScript files,
 * including React and Tailwind CSS integration.
 */

module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:tailwindcss/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Prettier handles formatting, so ESLint rules for formatting are disabled
    'tailwindcss/classnames-order': ['off'],
    // Allow 'any' type when necessary
    '@typescript-eslint/no-explicit-any': 'warn',
    // curly: ['error', 'all'],
  },
};
