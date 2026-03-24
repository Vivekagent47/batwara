//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  {
    ignores: [".output/**", "src/routeTree.gen.ts"],
  },
  ...tanstackConfig,
]
