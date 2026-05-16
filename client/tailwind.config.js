/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Navy / Steel / Burgundy / Cream palette
        midnight: { DEFAULT: '#022E4C', dark: '#011D31', light: '#1B4565' },
        lionsmane: { DEFAULT: '#E2D9CB', dark: '#CFC3AE' },
        celeste: { DEFAULT: '#517493', dark: '#3E5C76' },
        herb: { DEFAULT: '#517493', dark: '#3E5C76', light: '#7390AB' },
        marigold: { DEFAULT: '#56061D', dark: '#3D0414', light: '#7A1530' },

        // Brand aliases
        primary: {
          DEFAULT: '#022E4C',
          light: '#1B4565',
          dark: '#011D31',
          50: '#E2D9CB',
          100: '#517493',
        },
        accent: {
          DEFAULT: '#56061D',
          light: '#7A1530',
          dark: '#3D0414',
        },
        surface: '#E2D9CB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
