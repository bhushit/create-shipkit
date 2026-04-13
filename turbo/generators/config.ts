import type { PlopTypes } from "@turbo/gen";
import path from "path";

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator("web-only", {
    description: "Single-surface web app (Hono + Drizzle + Vite/React on Cloudflare Workers)",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "App name (kebab-case, e.g. my-app):",
        validate: (input: string) => {
          if (!input) return "Name is required";
          if (!/^[a-z][a-z0-9-]*$/.test(input)) return "Use kebab-case (lowercase letters, numbers, hyphens)";
          return true;
        },
      },
      {
        type: "input",
        name: "outputDir",
        message: "Output directory (absolute path or relative to cwd):",
        default: (answers: { name: string }) => `./${answers.name}`,
      },
    ],
    actions: (data) => {
      const outputDir = path.resolve(data!.outputDir);

      return [
        {
          type: "addMany",
          destination: outputDir,
          base: "templates/web-only",
          templateFiles: "templates/web-only/**/*.hbs",
          stripExtensions: [".hbs"],
          globOptions: { dot: true },
          verbose: true,
        } as PlopTypes.AddManyActionConfig,
      ];
    },
  });
}
