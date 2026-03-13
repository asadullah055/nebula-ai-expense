/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    fontWeight: {
      thin: "100",
      extralight: "200",
      light: "300",
      normal: "400",
      medium: "500",
      semibold: "500",
      bold: "600",
      extrabold: "700",
      black: "800"
    },
    extend: {
      fontFamily: {
        sans: ["Poppins", "Segoe UI", "system-ui", "sans-serif"]
      },
      colors: {
        brand: "var(--brand)",
        "brand-dark": "var(--brand-dark)"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(45, 31, 76, 0.12)"
      }
    }
  },
  plugins: []
};
