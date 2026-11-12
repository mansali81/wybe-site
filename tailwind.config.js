/** Tailwind config for wybe.fit — compiled build.
 *  This replaces the inline `tailwind.config` blocks that used to sit next to the
 *  Play CDN script on every page. The palette below is the union of all four
 *  inline variants that existed before (index.html held the superset); the
 *  variants differed only in formatting and in omitting tokens they did not use.
 */
module.exports = {
  content: [
    './*.html',
    './js/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette (from Wybe_colorpalette.pdf):
        //   #1E1E1E dark, #F6F2E8 warm off-white, #FF6600 brand orange.
        //   Older token names are kept so existing class names need no renaming.
        cream: '#F6F2E8',
        'cream-dark': '#EDE7D8',
        'sage-tint': '#F0EDDF',
        'sage-mist': '#E9E4CE',
        'charcoal-muted': '#4A6070',
        burgundy: '#FF6600',
        forest: '#001A24',
        'burgundy-dark': '#E65500',
        'charcoal-light': '#FFFFFF',
        charcoal: '#1E1E1E',

        // Accessibility tokens (WCAG 2.2 AA). The brand orange #FF6600 stays
        // for buttons, badges and accents; these are for TEXT only.
        'orange-ink': '#C2410C',  // orange text on white/light  — 5.2:1 on #FFF
        'grey-ink':   '#6B6B6B',  // secondary text on white/light — 5.3:1 on #FFF
        'grey-soft':  '#A3A3A3',  // secondary text on dark #1E1E1E — 6.6:1
      },
      fontFamily: {
        sans:    ['Raleway', 'Inter', 'sans-serif'],   // body default (Raleway light)
        heading: ['Inter', 'Raleway', 'sans-serif'],   // headings (Inter black)
      },
    },
  },
  // Utilities toggled at runtime from JS. They all appear as literal strings in
  // files the content globs above already scan, so this list is belt-and-braces:
  // it guarantees they survive even if a page's script is later refactored.
  safelist: [
    'hidden', 'block', 'flex',
    'bg-cream', 'bg-burgundy',
    'text-cream', 'text-white', 'text-charcoal',
    'border-burgundy', 'border-cream/10', 'border-cream/20',
    'border-charcoal/15', 'border-charcoal/20',
  ],
  plugins: [],
};
