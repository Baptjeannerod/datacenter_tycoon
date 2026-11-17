import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // The engine must stay pure: no DOM, no randomness, no clock.
    files: ['engine/**/*.ts'],
    ignores: ['engine/**/*.test.ts'],
    rules: {
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'fetch'],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use engine/rng.ts (seeded) so runs are reproducible.' },
        { object: 'Date', property: 'now', message: 'The engine has no clock; time is state.tick.' },
      ],
    },
  },
);
