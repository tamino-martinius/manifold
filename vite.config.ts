import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        chessboard: resolve(__dirname, "chessboard/index.html"),
        hilbert: resolve(__dirname, "hilbert/index.html"),
        goldbach: resolve(__dirname, "goldbach/index.html"),
        pascal: resolve(__dirname, "pascal/index.html"),
        ulam: resolve(__dirname, "ulam/index.html"),
        dragon: resolve(__dirname, "dragon/index.html"),
        toothpicks: resolve(__dirname, "toothpicks/index.html"),
        "ford-circles": resolve(__dirname, "ford-circles/index.html"),
        "prime-spiral": resolve(__dirname, "prime-spiral/index.html"),
        collatz: resolve(__dirname, "collatz/index.html"),
      },
    },
  },
});
