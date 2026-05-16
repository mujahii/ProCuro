/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Jenny Henderson palette
        midnight: { DEFAULT: '#013D5A', dark: '#012A3F', light: '#1A5572' },
        lionsmane: { DEFAULT: '#FCF3E3', dark: '#F0E4CC' },
        celeste: { DEFAULT: '#BDD3CE', dark: '#9CB8B2' },
        herb: { DEFAULT: '#708C69', dark: '#5A7254', light: '#8DA886' },
        marigold: { DEFAULT: '#F4A258', dark: '#E08B3F', light: '#F8BC85' },

        // Brand aliases (redefined to map onto new palette)
        primary: {
          DEFAULT: '#013D5A',
          light: '#1A5572',
          dark: '#012A3F',
          50: '#FCF3E3',
          100: '#BDD3CE',
        },
        accent: {
          DEFAULT: '#F4A258',
          light: '#F8BC85',
          dark: '#E08B3F',
        },
        surface: '#FCF3E3',
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
