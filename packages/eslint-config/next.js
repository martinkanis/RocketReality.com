import { baseConfig } from './base.js'

/**
 * Konfigurace pro Next.js aplikaci. Vrstvy: app/ smí importovat jen features/,
 * features/ nesmí sahat do app/ — hranice hlídá no-restricted-imports.
 */
export const nextConfig = [
  ...baseConfig,
  {
    files: ['src/features/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*'],
              message:
                'features/ a components/ nesmí importovat z app/ — routing je nejvyšší vrstva.',
            },
          ],
        },
      ],
    },
  },
]
