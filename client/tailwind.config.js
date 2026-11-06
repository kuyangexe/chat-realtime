/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          green: '#00a884',
          dark: '#128c7e',
          light: '#25d366',
          bg: '#efeae2',
          panel: '#f0f2f5',
          'panel-dark': '#202c33',
          'bubble-out': '#d9fdd3',
          'bubble-in': '#ffffff',
          'check-blue': '#53bdeb',
          'check-gray': '#8696a0',
          muted: '#667781',
          border: '#e9edef',
        },
      },
    },
  },
  plugins: [],
};
