/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #fb923c 0%, #f97316 55%, #ea580c 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
      },
    },
  },
  plugins: [],
};
