/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // We will support dark class or force it
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0A0A0C',
          card: '#121216',
          border: '#1E1E24',
          accent: '#6366F1', // Violet-500
          accentHover: '#4F46E5', // Violet-600
          success: '#10B981', // Emerald-500
          warning: '#F59E0B', // Amber-500
          danger: '#EF4444', // Red-500
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
