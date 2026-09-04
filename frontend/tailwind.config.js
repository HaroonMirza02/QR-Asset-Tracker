/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f3ff',
          100: '#e0e7ff',
          500: '#4f46e5',
          600: '#4338ca',
          700: '#3730a3',
        },
        status: {
          available: {
            bg: '#ecfdf5',
            text: '#047857',
            border: '#a7f3d0',
            dot: '#10b981',
          },
          assigned: {
            bg: '#eff6ff',
            text: '#1d4ed8',
            border: '#bfdbfe',
            dot: '#3b82f6',
          },
          repair: {
            bg: '#fffbeb',
            text: '#b45309',
            border: '#fde68a',
            dot: '#f59e0b',
          },
          retired: {
            bg: '#f1f5f9',
            text: '#475569',
            border: '#cbd5e1',
            dot: '#64748b',
          },
          lost: {
            bg: '#fef2f2',
            text: '#b91c1c',
            border: '#fecaca',
            dot: '#ef4444',
          },
        },
      },
    },
  },
  plugins: [],
};
