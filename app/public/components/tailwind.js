// /components/tailwind.js
/* global tailwind */
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#00e6cf",
        secondary: "#7c3aed",
        "background-light": "#f9fafb",
        "background-dark": "#0a0c10",
        "surface-dark": "#121721",
        "accent-teal": "#00e6cf",
        "accent-violet": "#8b5cf6"
      },
      fontFamily: { display: ["Space Grotesk", "sans-serif"] },
      borderRadius: { DEFAULT: "0.5rem", lg: "1rem", xl: "1.5rem", full: "9999px" }
    }
  }
};
