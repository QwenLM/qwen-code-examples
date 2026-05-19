/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        handwriting: ["'Ma Shan Zheng'", "cursive"],
      },
      colors: {
        note: {
          yellow: "#fef3c7",
          pink: "#fce7f3",
          blue: "#dbeafe",
          green: "#d1fae5",
          purple: "#ede9fe",
          orange: "#ffedd5",
        },
      },
    },
  },
  plugins: [],
};
