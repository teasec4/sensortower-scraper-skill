export type LightpandaDumpFormat = "html" | "markdown" | "semantic_tree" | "semantic_tree_text";

export type LightpandaFetchOptions = {
  dump?: LightpandaDumpFormat;
  stripMode?: string;
  waitMs?: number;
  waitSelector?: string;
  waitUntil?: "load" | "domcontentloaded" | "networkidle" | "done";
};

export type LightpandaSnapshot = {
  url: string;
  content: string;
  stderr: string;
};

export async function fetchWithLightpanda(
  url: string,
  options: LightpandaFetchOptions = {},
): Promise<LightpandaSnapshot> {
  const binary = Bun.env.LIGHTPANDA_BIN ?? "lightpanda";
  const args = [binary, "fetch", "--dump", options.dump ?? "markdown"];

  if (options.stripMode !== undefined) {
    args.push("--strip-mode", options.stripMode);
  }

  if (options.waitMs !== undefined) {
    args.push("--wait-ms", String(options.waitMs));
  }

  if (options.waitUntil !== undefined) {
    args.push("--wait-until", options.waitUntil);
  }

  if (options.waitSelector !== undefined) {
    args.push("--wait-selector", options.waitSelector);
  }

  args.push(url);

  const process = Bun.spawn(args, {
    stderr: "pipe",
    stdout: "pipe",
  });

  const [content, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(`Lightpanda failed with exit code ${exitCode}: ${stderr.trim()}`);
  }

  return {
    url,
    content,
    stderr,
  };
}
