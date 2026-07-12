/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0a1628',
          800: '#0f2038',
          700: '#16304f',
          600: '#1e3a5f',
        },
        teal: {
          500: '#0fb5a6',
          600: '#0a9488',
          50: '#e6f7f5',
        },
        ink: {
          900: '#0d1421',
          700: '#33415c',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafc',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '28px',
      },
      boxShadow: {
        glow: '0 6px 16px rgba(15,181,166,.35)',
        card: '0 18px 40px rgba(2, 8, 23, 0.18), 0 4px 10px rgba(2, 8, 23, 0.1)',
      },
    },
  },
  plugins: [],
};
