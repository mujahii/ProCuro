/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Copper / Inkwell / Mocha / Cream palette
        midnight: { DEFAULT: '#394B6F', dark: '#2A3A58', light: '#4D6490' },
        lionsmane: { DEFAULT: '#F7F8F4', dark: '#EDEEE8' },
        celeste: { DEFAULT: '#C1B39A', dark: '#A89A82' },
        herb: { DEFAULT: '#C1B39A', dark: '#A89A82', light: '#D4C9B8' },
        marigold: { DEFAULT: '#A87C4F', dark: '#8A6440', light: '#C49A6E' },

        // Brand aliases
        primary: {
          DEFAULT: '#394B6F',
          light: '#4D6490',
          dark: '#2A3A58',
          50: '#F7F8F4',
          100: '#C1B39A',
        },
        accent: {
          DEFAULT: '#A87C4F',
          light: '#C49A6E',
          dark: '#8A6440',
        },
        surface: '#F7F8F4',
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
