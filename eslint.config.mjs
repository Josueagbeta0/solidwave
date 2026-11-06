import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Three Fiber scenes mutate three.js objects (renderer, camera,
    // meshes) imperatively inside effects. That is the intended R3F pattern,
    // not a React state mutation.
    files: ["components/studio/IconCanvas.tsx", "components/landing/HeroScene.tsx"],
    rules: { "react-hooks/immutability": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
