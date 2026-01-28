// tailwind-config.js
/* global tailwind */
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#00e6cf",
        "background-light": "#f9fafb",
        "background-dark": "#0f131a",
        "card-bg": "rgba(24, 30, 41, 0.6)",
      },
      fontFamily: { "display": ["Space Grotesk", "sans-serif"] },
      borderRadius: { DEFAULT: "0.5rem", lg: "1rem", xl: "1.5rem", full: "9999px" }
    }
  }
};
