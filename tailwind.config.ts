import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyan: {
          accent: '#00d4ff',
          dim:    '#00b8e0',
        },
      },
      fontFamily: {
        mono: ['"Courier Prime"', '"Space Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config