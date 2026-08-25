import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = path.join(siteRoot, 'src/content/docs');
const matrix = JSON.parse(await readFile(
  path.join(siteRoot, 'src/data/binding-capabilities.json'),
  'utf8',
));

const errors = [];
const capabilityNames = Object.keys(matrix.capabilities);

for (const language of matrix.languages) {
  if (!capabilityNames.includes(language)) {
    errors.push(`binding-capabilities.json has no capabilities for ${language}`);
  }
}

for (const [relativePath, expectedLanguages] of Object.entries(matrix.guideCoverage)) {
  const source = await readFile(path.join(docsRoot, relativePath), 'utf8');
  const labels = new Set(
    [...source.matchAll(/<TabItem\s+label="([^"]+)"/g)].map((match) => match[1]),
  );
  for (const language of expectedLanguages) {
    if (!labels.has(language)) {
      errors.push(`${relativePath} has no ${language} example tab`);
    }
  }
}

const tasks = await readFile(path.join(docsRoot, 'guides/tasks.mdx'), 'utf8');
for (const marker of ['title: Function tasks', 'label="Python"', 'label="Java"', 'label="Kotlin"', 'Python only']) {
  if (!tasks.toLowerCase().includes(marker.toLowerCase())) {
    errors.push(`guides/tasks.mdx is missing required scope marker: ${marker}`);
  }
}

const filesWithKnownRegressions = [
  'guides/pubsub.mdx',
  'guides/streams.mdx',
  'reference/bindings.mdx',
];
const forbidden = [
  'db.listen("orders") do |notif|',
  'Honker.listen(db, "orders")',
  'These options are Python-only',
  'available from any binding',
  'No JVM/Kotlin jobs run in PR CI',
];

for (const relativePath of filesWithKnownRegressions) {
  const source = await readFile(path.join(docsRoot, relativePath), 'utf8');
  for (const phrase of forbidden) {
    if (source.includes(phrase)) {
      errors.push(`${relativePath} contains stale language-scope claim: ${phrase}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Documentation capability check failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Documentation capability check passed for ${matrix.languages.length} bindings.`);
}
