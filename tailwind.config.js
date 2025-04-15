/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    'bg-blue-500',
    'bg-blue-700',
    'bg-gray-200',
    'bg-gray-300',
    'text-white',
    'text-gray-800',
    'text-gray-600',
    'text-green-500',
    'text-red-500'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} 