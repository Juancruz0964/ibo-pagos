/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de marca (Deep Space Blue / Lavender Grey / Mint Cream / rojos)
        navy: {
          50: '#f2f3f4', 100: '#e1e2e5', 200: '#c3c5ca', 300: '#a0a4ac', 400: '#707683',
          500: '#454d5d', 600: '#273043', 700: '#212939', 800: '#1b222f', 900: '#151a25',
        },
        mist: {
          50: '#f8f9fa', 100: '#f0f0f4', 200: '#e0e2e8', 300: '#cfd1db', 400: '#b6baca',
          500: '#a0a6b9', 600: '#9197ae', 700: '#7b8094', 800: '#666a7a', 900: '#505360',
        },
        // Escala de "Mint Cream" usada como neutro general (reemplaza el gris
        // "stone" de antes): 50-200 son los fondos/tonos clarous cerca del
        // crema real, 300-900 se oscurecen para servir de texto/bordes.
        cream: {
          50: '#f7fbf7', 100: '#f3f8f2', 200: '#eff6ee', 300: '#d9e0d8', 400: '#bfc5be',
          500: '#9da19b', 600: '#7f827d', 700: '#5c5e5a', 800: '#424440', 900: '#2d2d2a',
        },
        brand: {
          50: '#fdf0f2', 100: '#fadce1', 200: '#f5b9c2', 300: '#f091a0', 400: '#e95970',
          500: '#f02d3a', 600: '#dd0426', 700: '#bc0320', 800: '#9b031b', 900: '#7a0215',
        },
      },
    },
  },
  plugins: [],
}
