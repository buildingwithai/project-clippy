/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'], // Enable dark mode using a class
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './src/popup/index.html',
  ],
  theme: {
    extend: {
      colors: {
        // Example subtle astronomy theme colors (can be expanded)
        'space-dark': '#0f172a', // A very dark blue, like deep space
        'nebula-blue': '#1e3a8a', // A brighter, more vibrant blue
        'star-yellow': '#facc15', // For highlights, like stars
        'cosmic-purple': '#581c87', // A deep purple
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // A clean, modern font
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "active-glow": { // New keyframes
          '0%': { boxShadow: '0 0 0px 0px rgba(250, 204, 21, 0)' }, // facc15 is star-yellow
          '50%': { boxShadow: '0 0 15px 5px rgba(250, 204, 21, 0.5)' },
          '100%': { boxShadow: '0 0 0px 0px rgba(250, 204, 21, 0)' },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "active-glow": "active-glow 300ms ease-out", // New animation utility
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
