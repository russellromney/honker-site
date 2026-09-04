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
const languageSet = new Set(matrix.languages);
const capabilityNames = Object.keys(matrix.capabilities);

function sameMembers(actual, expected) {
  return actual.size === expected.size && [...actual].every((item) => expected.has(item));
}

function describeDifference(actual, expected) {
  const missing = [...expected].filter((item) => !actual.has(item));
  const unexpected = [...actual].filter((item) => !expected.has(item));
  return [
    missing.length > 0 ? `missing: ${missing.join(', ')}` : '',
    unexpected.length > 0 ? `unexpected: ${unexpected.join(', ')}` : '',
  ].filter(Boolean).join('; ');
}

function extractSection(source, heading, relativePath) {
  const marker = `## ${heading}`;
  const start = source.indexOf(marker);
  if (start === -1) {
    errors.push(`${relativePath} has no ${marker} section`);
    return '';
  }
  const end = source.indexOf('\n## ', start + marker.length);
  return source.slice(start, end === -1 ? source.length : end);
}

function tabLabels(source) {
  return new Set(
    [...source.matchAll(/<TabItem\s+label="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((label) => languageSet.has(label)),
  );
}

function expectedLanguages(selector) {
  if (selector === 'all') return new Set(matrix.languages);
  if (selector === 'listen:high-level') {
    return new Set(matrix.languages.filter(
      (language) => matrix.capabilities[language].listen === 'high-level',
    ));
  }
  if (selector === 'functionTasks') {
    return new Set(matrix.languages.filter(
      (language) => matrix.capabilities[language].functionTasks !== 'queue-primitives',
    ));
  }
  errors.push(`binding-capabilities.json has unknown guide selector: ${selector}`);
  return new Set();
}

function parseBindingTable(source, header, relativePath) {
  const lines = source.split('\n');
  const headerIndex = lines.findIndex(
    (line) => line.startsWith('| Binding |') && line.includes(`| ${header} |`),
  );
  if (headerIndex === -1) {
    errors.push(`${relativePath} has no Binding/${header} table`);
    return new Map();
  }

  const rows = new Map();
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith('|')) break;
    const cells = line.slice(1, -1).split('|').map((cell) => cell.trim());
    for (const language of cells[0].split(',').map((item) => item.trim())) {
      if (!languageSet.has(language)) {
        errors.push(`${relativePath} table ${header} has unknown binding: ${language}`);
      } else if (rows.has(language)) {
        errors.push(`${relativePath} table ${header} repeats ${language}`);
      } else {
        rows.set(language, cells.slice(1));
      }
    }
  }

  const actual = new Set(rows.keys());
  if (!sameMembers(actual, languageSet)) {
    errors.push(`${relativePath} table ${header} does not cover the binding matrix (${describeDifference(actual, languageSet)})`);
  }
  return rows;
}

function checkTableCell(rows, language, columnIndex, expected, tableName) {
  const actual = rows.get(language)?.[columnIndex];
  if (actual !== expected) {
    errors.push(`${tableName}: ${language} column ${columnIndex + 1} is ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)}`);
  }
}

if (!sameMembers(new Set(capabilityNames), languageSet)) {
  errors.push(`binding-capabilities.json capability keys differ from languages (${describeDifference(new Set(capabilityNames), languageSet)})`);
}

const requiredCapabilities = [
  'functionTasks',
  'listen',
  'notificationPrune',
  'streamSubscription',
  'streamOffsetTx',
  'typedPayloads',
];
for (const language of matrix.languages) {
  const capability = matrix.capabilities[language];
  if (!capability) continue;
  for (const name of requiredCapabilities) {
    if (!(name in capability)) {
      errors.push(`binding-capabilities.json has no ${name} value for ${language}`);
    }
  }
}

for (const [relativePath, sections] of Object.entries(matrix.guideSections)) {
  const source = await readFile(path.join(docsRoot, relativePath), 'utf8');
  for (const [heading, selector] of Object.entries(sections)) {
    const actual = tabLabels(extractSection(source, heading, relativePath));
    const expected = expectedLanguages(selector);
    if (!sameMembers(actual, expected)) {
      errors.push(`${relativePath} section ${heading} has incorrect binding tabs (${describeDifference(actual, expected)})`);
    }
  }
}

const tasksPath = 'guides/tasks.mdx';
const tasks = await readFile(path.join(docsRoot, tasksPath), 'utf8');
for (const marker of ['title: Function tasks', 'Python only']) {
  if (!tasks.toLowerCase().includes(marker.toLowerCase())) {
    errors.push(`${tasksPath} is missing required scope marker: ${marker}`);
  }
}
const taskRows = parseBindingTable(tasks, 'Function-task API', tasksPath);
const taskDescriptions = {
  'decorators-registry-cli-periodic': 'Decorators, in-process workers, worker CLI, and periodic-task decorator',
  registry: {
    Java: 'Explicit `TaskRegistry`, `TaskHandle`, `runTasks`, and result handles',
    Kotlin: 'Kotlin registry helpers over the Java task runtime',
  },
  'queue-primitives': 'Queue and result primitives; no function-task registry/dispatcher',
};
for (const language of matrix.languages) {
  const kind = matrix.capabilities[language].functionTasks;
  const expected = typeof taskDescriptions[kind] === 'string'
    ? taskDescriptions[kind]
    : taskDescriptions[kind]?.[language];
  checkTableCell(taskRows, language, 0, expected, `${tasksPath} function-task table`);
}

const queuesPath = 'guides/queues.mdx';
const queues = await readFile(path.join(docsRoot, queuesPath), 'utf8');
const typedRows = parseBindingTable(queues, 'Typed payloads', queuesPath);
for (const language of matrix.languages) {
  const typed = matrix.capabilities[language].typedPayloads;
  for (const [index, key] of ['surface', 'checked', 'claimed', 'snapshot'].entries()) {
    checkTableCell(typedRows, language, index, typed[key], `${queuesPath} typed-payload table`);
  }
}

const pubsubPath = 'guides/pubsub.mdx';
const pubsub = await readFile(path.join(docsRoot, pubsubPath), 'utf8');
const pruningRows = parseBindingTable(pubsub, 'Typed age pruning', pubsubPath);
for (const language of matrix.languages) {
  const pruning = matrix.capabilities[language].notificationPrune;
  checkTableCell(pruningRows, language, 0, pruning.age ? 'yes' : 'no', `${pubsubPath} pruning table`);
  checkTableCell(pruningRows, language, 1, pruning.maxCount ? 'yes' : 'no', `${pubsubPath} pruning table`);
}

const streamsPath = 'guides/streams.mdx';
const streams = await readFile(path.join(docsRoot, streamsPath), 'utf8');
const replayRows = parseBindingTable(streams, 'Saved consumer offset', streamsPath);
for (const language of matrix.languages) {
  const subscription = matrix.capabilities[language].streamSubscription;
  checkTableCell(replayRows, language, 0, subscription.savedOffset, `${streamsPath} replay table`);
  checkTableCell(replayRows, language, 1, subscription.explicitStart, `${streamsPath} replay table`);
  checkTableCell(replayRows, language, 2, subscription.consumerOptional, `${streamsPath} replay table`);
}

const offsetRows = parseBindingTable(streams, 'Transaction-aware offset save', streamsPath);
for (const language of matrix.languages) {
  const expected = matrix.capabilities[language].streamOffsetTx === 'typed'
    ? 'Typed transaction-aware method'
    : 'Run `honker_stream_save_offset` through the open transaction';
  checkTableCell(offsetRows, language, 0, expected, `${streamsPath} transaction-offset table`);
}

const filesWithKnownRegressions = [pubsubPath, streamsPath, 'reference/bindings.mdx'];
const forbidden = [
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

const packageJson = JSON.parse(await readFile(path.join(siteRoot, 'package.json'), 'utf8'));
for (const scriptName of ['deploy', 'deploy:preview']) {
  if (!packageJson.scripts[scriptName]?.includes('npm run build')) {
    errors.push(`package.json ${scriptName} bypasses the documentation capability check`);
  }
}

if (errors.length > 0) {
  console.error('Documentation capability check failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Documentation capability check passed for ${matrix.languages.length} bindings.`);
}
