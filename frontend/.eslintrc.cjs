module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // React 17+ new JSX transform — no need to import React in scope
    'react/react-in-jsx-scope': 'off',
    // Hackathon project — no PropTypes enforcement
    'react/prop-types': 'off',
    // Allow unused vars that start with underscore (convention)
    'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    // Exhaustive-deps is a warning, not error — keep CI green
    'react-hooks/exhaustive-deps': 'warn',
  },
};
