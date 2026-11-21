/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-dark': 'var(--primary-dark)',
        'primary-soft': 'var(--primary-soft)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        appbg: 'var(--app-bg)',
        card: 'var(--card)',
        income: 'var(--income)',
        'income-soft': 'var(--income-soft)',
        expense: 'var(--expense)',
        'expense-soft': 'var(--expense-soft)',
      },
      fontFamily: {
        body: ['Hind Siliguri', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: { card: '0 2px 14px rgba(20,33,29,.05)' },
    },
  },
  plugins: [],
};
