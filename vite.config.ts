import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        chessboard: resolve(__dirname, "chessboard/index.html"),
        "langtons-ant": resolve(__dirname, "langtons-ant/index.html"),
      },
    },
  },
});
