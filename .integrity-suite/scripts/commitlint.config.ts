/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'never'],
    'subject-ascii-only': [2, 'always'],
  },
  plugins: [
    {
      rules: {
        'subject-ascii-only': ({ subject }) => {
          const isAscii = subject ? [...subject].every((c) => c.charCodeAt(0) <= 127) : true;
          return [isAscii, 'Commit message must be in English (ASCII only)'];
        },
      },
    },
  ],
};

export default config;
