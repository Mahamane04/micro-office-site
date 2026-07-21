/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{njk,html,js,md}"],
  theme: {
    extend: {
      colors: {
        red: {
          DEFAULT: "#F01B2D",
          dark: "#C81625",
        },
        ink: "#050505",
        anthracite: "#171717",
        offwhite: "#F6F6F3",
        grey: "#737373",
      },
      fontFamily: {
        heading: ["Clash Display", "ui-sans-serif", "sans-serif"],
        body: ["Geist", "ui-sans-serif", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        blueprint: "radial-gradient(currentColor 1px, transparent 1px)",
      },
      backgroundSize: {
        blueprint: "22px 22px",
      },
      maxWidth: {
        content: "1200px",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        soft: "0 20px 50px -24px rgba(5,5,5,0.18)",
        "soft-dark": "0 30px 60px -24px rgba(0,0,0,0.6)",
        btn: "0 12px 28px -10px rgba(240,27,45,0.55)",
      },
      transitionDuration: {
        250: "250ms",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 36s linear infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
