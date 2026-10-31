/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // "class" follows the system theme by default and lets Settings pick one (SPEC §10.2). "media" crashes NativeWind on web.
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};
