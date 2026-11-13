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
        // BRAND PALETTE — the only three colours on the site. Softer tones are
        // made by lowering the opacity of one of these, never by adding a hue.
        //   #1E1E1E dark   #FF6600 orange   #FFFFFF white
        // The three token names below are kept (671 / 421 / 142 class uses)
        // and now point at brand values, so `text-cream/70` resolves to
        // rgba(255,255,255,0.7) — white at reduced opacity, per the guidelines.
        cream: '#FFFFFF',
        burgundy: '#FF6600',
        charcoal: '#1E1E1E',

        // Reduced-opacity aliases. No slash modifier is used on either, so a
        // literal rgba() value is safe here.
        'burgundy-dark': 'rgba(255, 102, 0, 0.85)',  // hover: brand orange, dimmed
        'grey-soft':     'rgba(255, 255, 255, 0.65)', // secondary text on dark

        // Removed: cream-dark #EDE7D8, sage-tint #F0EDDF, sage-mist #E9E4CE,
        // charcoal-muted #4A6070, forest #001A24, charcoal-light #FFFFFF,
        // orange-ink #C2410C, grey-ink #6B6B6B — all off-brand and all unused
        // (0 class references across *.html and js/**).
      },
      // Tailwind's stock shadow and ring colours are a neutral black and a
      // blue; both are off-brand, so they are restated here in brand dark and
      // brand orange at the same opacities. Geometry is Tailwind's own, byte
      // for byte, so nothing moves.
      boxShadow: {
        DEFAULT: '0 1px 3px 0 rgba(30, 30, 30, 0.1), 0 1px 2px -1px rgba(30, 30, 30, 0.1)',
        md:      '0 4px 6px -1px rgba(30, 30, 30, 0.1), 0 2px 4px -2px rgba(30, 30, 30, 0.1)',
        lg:      '0 10px 15px -3px rgba(30, 30, 30, 0.1), 0 4px 6px -4px rgba(30, 30, 30, 0.1)',
        xl:      '0 20px 25px -5px rgba(30, 30, 30, 0.1), 0 8px 10px -6px rgba(30, 30, 30, 0.1)',
        '2xl':   '0 25px 50px -12px rgba(30, 30, 30, 0.25)',
        inner:   'inset 0 2px 4px 0 rgba(30, 30, 30, 0.05)',
      },
      ringColor: {
        DEFAULT: 'rgba(255, 102, 0, 0.5)',
      },
      dropShadow: {
        DEFAULT: ['0 1px 2px rgba(30, 30, 30, 0.1)', '0 1px 1px rgba(30, 30, 30, 0.06)'],
        sm:      '0 1px 1px rgba(30, 30, 30, 0.05)',
        md:      ['0 4px 3px rgba(30, 30, 30, 0.07)', '0 2px 2px rgba(30, 30, 30, 0.06)'],
        lg:      ['0 10px 8px rgba(30, 30, 30, 0.04)', '0 4px 3px rgba(30, 30, 30, 0.1)'],
        xl:      ['0 20px 13px rgba(30, 30, 30, 0.03)', '0 8px 5px rgba(30, 30, 30, 0.08)'],
        '2xl':   '0 25px 25px rgba(30, 30, 30, 0.15)',
      },
      fontFamily: {
        sans:    ['Raleway', 'Inter', 'sans-serif'],   // body + sub-headings (Raleway 400 / 600)
        heading: ['Inter', 'Raleway', 'sans-serif'],   // headers (Inter 900), UI labels (Inter 600)
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
