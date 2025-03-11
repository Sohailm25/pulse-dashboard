/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--primary))',
        'primary-foreground': 'rgb(var(--primary-foreground))',
        purple: {
          600: '124, 58, 237'
        },
        blue: {
          600: '37, 99, 235'
        },
        green: {
          600: '22, 163, 74'
        },
        yellow: {
          600: '202, 138, 4'
        },
        orange: {
          600: '234, 88, 12'
        },
        red: {
          600: '220, 38, 38'
        },
        pink: {
          600: '219, 39, 119'
        },
        indigo: {
          600: '79, 70, 229'
        }
      },
      screens: {
        'mobile': {'max': '768px'},
        'tablet': {'max': '1024px'},
      }
    },
  },
  plugins: [
    // Remove Typography plugin for now since it's not installed
    // require('@tailwindcss/typography'),
  ],
};