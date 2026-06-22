import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist/", "units/**/*.cjs"] },
  ...tseslint.configs.recommended,
  prettier,
);
