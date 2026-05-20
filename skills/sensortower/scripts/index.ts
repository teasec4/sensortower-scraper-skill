#!/usr/bin/env bun

import { formatRows, helpText, parseCliArgs } from "./cli";
import { scrapeTopApps } from "./scrape";

async function main(): Promise<void> {
  const command = parseCliArgs(Bun.argv.slice(2));

  if (command.kind === "help") {
    console.log(helpText());
    return;
  }

  const rows = await scrapeTopApps(command.options);
  const output = formatRows(rows, command.options.format);

  if (command.options.out !== undefined) {
    await Bun.write(command.options.out, output);
    console.error(`Wrote ${rows.length} rows to ${command.options.out}`);
    return;
  }

  process.stdout.write(output);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
