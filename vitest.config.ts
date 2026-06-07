import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",
    reporters: ["verbose"],
    testTimeout: 30000,
  },
});
