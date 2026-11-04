/** @type {import('tailwindcss').Config} */

// Brand colors are CSS variables from global.css (Holy Hush palette), so dark mode needs no dark: classes
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // "class" follows the system theme by default and lets Settings pick one (SPEC §10.2). "media" crashes NativeWind on web.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: token('page'),
        bg: token('bg'),
        card: token('card'),
        ink: token('ink'),
        muted: token('muted'),
        dim: token('dim'),
        line: token('line'),
        line2: token('line2'),
        olive: token('olive'),
        'olive-deep': token('olive-deep'),
        gold: token('gold'),
        // Pastel surfaces keep dark ink in both themes
        butter: token('butter'),
        sage: token('sage'),
        sky: token('sky'),
        lav: token('lav'),
        rose: token('rose'),
        'on-pastel': token('on-pastel'),
        danger: token('danger'),
      },
      // Custom fonts on native are one file per weight, so each weight is its own family
      fontFamily: {
        // Hanken Grotesk, like the website: 500 for text and buttons, 600 for titles
        sans: ['HankenGrotesk_500Medium'],
        'sans-semibold': ['HankenGrotesk_600SemiBold'],
        'sans-bold': ['HankenGrotesk_700Bold'],
        display: ['HankenGrotesk_600SemiBold'],
        serif: ['Literata_400Regular'],
      },
    },
  },
  plugins: [],
};
