#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

async function main() {
  const projectRoot = process.cwd();
  const packsDir = path.resolve(projectRoot, 'packs');
  const docsPacksDir = path.resolve(projectRoot, 'docs', 'packs');

  await fs.mkdir(docsPacksDir, { recursive: true });

  const files = (await fs.readdir(packsDir)).filter(
    (f) => f.endsWith('.json') && f !== 'index.json'
  );

  const registry = [];

  for (const file of files) {
    const filePath = path.join(packsDir, file);
    const raw = await fs.readFile(filePath, 'utf-8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`Skipping malformed JSON file: ${file}`);
      continue;
    }

    registry.push({
      id: data.id ?? path.basename(file, '.json'),
      name: data.name ?? '',
      version: data.version ?? '1.0.0',
      snippetCount: Array.isArray(data.snippets) ? data.snippets.length : 0,
    });
  }

  const outPath = path.join(docsPacksDir, 'index.json');
  await fs.writeFile(outPath, JSON.stringify(registry, null, 2));
  console.log(`Generated pack registry with ${registry.length} entries → ${path.relative(projectRoot, outPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
