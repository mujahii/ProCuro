/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Navy / Gold / Aqua / Teal / Sand palette
        midnight: { DEFAULT: '#083A4F', dark: '#052532', light: '#1B5468' },
        lionsmane: { DEFAULT: '#E5E1DD', dark: '#CFC8BE' },
        celeste: { DEFAULT: '#C0D5D6', dark: '#A2BCBE' },
        herb: { DEFAULT: '#407E8C', dark: '#2F606C', light: '#5E96A4' },
        marigold: { DEFAULT: '#A58D66', dark: '#8A7553', light: '#BFA988' },

        // Brand aliases
        primary: {
          DEFAULT: '#083A4F',
          light: '#1B5468',
          dark: '#052532',
          50: '#E5E1DD',
          100: '#C0D5D6',
        },
        accent: {
          DEFAULT: '#A58D66',
          light: '#BFA988',
          dark: '#8A7553',
        },
        surface: '#E5E1DD',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
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
