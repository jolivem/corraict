import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Couleur primaire = bleu marine (boutons, liens). Repurpose de `brand`
        // pour que tout le site bascule automatiquement.
        brand: {
          50: '#E9EFF2',
          100: '#D6E2E8',
          500: '#2E6076',
          600: '#1E4D63',
          700: '#163E4F',
        },
        // Palette « papier chaud » de la maquette — éclaircie pour un rendu
        // plus doux et reposant (important pour les lecteurs dyslexiques),
        // tout en évitant le blanc pur qui éblouit.
        cream: '#F5F0E6', // fond de page
        surface: '#FDFBF7', // cartes
        'surface-muted': '#EFE9DB', // boîtes internes (états vides)
        ink: '#1E4D63', // titres / liens / texte marine
        'ink-strong': '#15384A', // survol
        body: '#3D3A34', // texte courant
        muted: '#8C8579', // texte secondaire
        line: '#E7E0CF', // bordures
        success: '#1F7A4D',
        'success-bg': '#E8F1EA',
        'success-text': '#1C5E3B',
        danger: '#9C6711',
        'danger-bg': '#FAF1DD',
        'danger-line': '#E7D3A8',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
