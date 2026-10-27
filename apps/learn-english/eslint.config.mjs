import { defineConfig } from "eslint/config";
import nextConfig from "@repo/eslint-config/next";

export default defineConfig([
  ...nextConfig,
  {
    // Dice UI's tour (shadcn registry, CLI-owned) reads refs during render on
    // purpose to position the floating step; the React Compiler rules flag it.
    files: ["src/components/ui/tour.tsx"],
    rules: { "react-hooks/refs": "off", "react-hooks/exhaustive-deps": "off", "@typescript-eslint/no-unused-vars": "off" },
  },
]);
