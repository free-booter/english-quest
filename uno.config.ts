import {
  defineConfig,
  presetIcons,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({ scale: 1.2 }),
    presetWebFonts({
      provider: 'google',
      fonts: {
        sans: 'Inter:400,500,600,700',
        mono: 'JetBrains Mono:400,600',
      },
    }),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  theme: {
    colors: {
      brand: {
        50: '#ecfdf5',
        100: '#d1fae5',
        300: '#6ee7b7',
        500: '#10b981',
        600: '#059669',
        700: '#047857',
      },
      gold: {
        50: '#fffbeb',
        400: '#fbbf24',
        500: '#f59e0b',
        600: '#d97706',
      },
    },
  },
  shortcuts: {
    'btn': 'inline-flex items-center justify-center px-4 py-2 rounded-xl font-semibold transition duration-200 active:scale-95 cursor-pointer',
    'btn-primary': 'btn bg-gradient-to-br from-brand-500 to-brand-600 text-white hover:shadow-lg hover:shadow-brand-500/30',
    'btn-ghost': 'btn bg-white/60 backdrop-blur text-brand-600 hover:bg-white/80 border border-brand-200/30',
    'card': 'bg-white/80 backdrop-blur-sm rounded-3xl shadow-md hover:shadow-xl transition-shadow duration-300 p-5 border border-white/50',
    'card-accent': 'bg-gradient-to-br from-white/90 to-brand-50/40 backdrop-blur-sm rounded-3xl shadow-lg p-5 border border-brand-200/30',
    'page': 'min-h-screen w-full px-4 pt-6 pb-24 max-w-screen-sm mx-auto animate-[pageIn_0.6s_ease-out]',
  },
})
