import {
  defineConfig,
  presetIcons,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({ scale: 1.2 }),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  theme: {
    colors: {
      brand: {
        50: '#F0F9FF',
        100: '#E0F2FE',
        300: '#7DD3FC',
        500: '#0EA5E9',
        600: '#0284C7',
        700: '#0369A1',
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
    'btn': 'inline-flex items-center justify-center px-5 py-3 rounded-full font-bold transition duration-150 active:scale-98 cursor-pointer select-none',
    'btn-primary': 'btn bg-brand-500 text-white active:opacity-90',
    'btn-ghost': 'btn bg-white text-brand-600 border-2 border-brand-100',
    'card': 'bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.07)] p-5',
    'card-accent': 'bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.07)] p-5',
    'page': 'min-h-screen w-full px-4 pt-6 pb-28 max-w-screen-sm mx-auto animate-[pageIn_0.6s_ease-out]',
  },
})
