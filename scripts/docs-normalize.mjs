import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const START = '<!-- POWERFARM-MAP:START -->';
const END = '<!-- POWERFARM-MAP:END -->';
const COPYRIGHT = 'Copyright © 2026 PowerFarm. All rights reserved.';

const isExcluded = rel => rel.includes('/.pytest_cache/') || rel.startsWith('.pytest_cache/');
const posix = p => p.split(path.sep).join('/');
const relLink = (from, target) => {
  let r = posix(path.relative(path.dirname(from), target));
  if (!r.startsWith('.')) r = './' + r;
  return r;
};

function allMarkdown(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...allMarkdown(p));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) out.push(p);
  }
  return out;
}

function kind(rel) {
  const b = path.posix.basename(rel).toUpperCase();
  if (b.startsWith('CHANGELOG')) return 'HISTORY';
  if (rel.includes('/superpowers/plans/')) return 'PLAN';
  if (rel.includes('/superpowers/specs/')) return 'DESIGN';
  if (rel.includes('/operations/')) return 'OPERATIONS';
  if (rel.startsWith('supabase/history/')) return 'HISTORY';
  if (rel.startsWith('brand/')) return b === 'SOURCE-STATUS.MD' ? 'STATUS' : 'BRAND';
  if (b === 'NAMESPACE.MD') return 'NAMESPACE';
  if (b === 'PLANO.MD') return 'PLAN';
  if (b === 'DOCUMENTATION.MD') return 'MAP';
  if (b.includes('AUTHORITY-EXTRACTION')) return 'BOUNDARY';
  return 'README';
}

function mapPath(rel) {
  const parts = rel.split('/');
  if (parts[0] === 'brand') return ['Registry', 'Brand', ...parts.slice(1, -1)].join(' / ');
  if (parts[0] === 'docs') return ['Registry', 'Docs', ...parts.slice(1, -1)].join(' / ');
  if (parts[0] === 'supabase') return ['Registry', 'Database custody', ...parts.slice(1, -1)].join(' / ');
  return 'Registry';
}

function localHome(rel) {
  if (rel.startsWith('brand/')) return 'brand/MASTER-README.md';
  if (rel.startsWith('docs/operations/')) return 'docs/operations/supabase-migration-custody.md';
  return 'README.md';
}

function mapBlock(rel) {
  const fileAbs = path.join(root, rel);
  const targets = [
    ['Registry', 'README.md'],
    ['Documentation map', 'DOCUMENTATION.md'],
  ];
  const local = localHome(rel);
  if (local !== rel && !targets.some(([,t]) => t === local) && fs.existsSync(path.join(root, local))) targets.push(['Local home', local]);
  if (fs.existsSync(path.join(root, 'docs/AUTHORITY-EXTRACTION.md')) && rel !== 'docs/AUTHORITY-EXTRACTION.md') targets.push(['Authority boundary', 'docs/AUTHORITY-EXTRACTION.md']);
  const nav = targets.map(([label,t]) => `[${label}](${relLink(fileAbs, path.join(root,t))})`).join(' · ');
  return `${START}\n> **PowerFarm map** · \`${mapPath(rel)}\` · **${kind(rel)}**  \n> **Navigate:** ${nav}  \n> **Boundary:** Registry owns Identity, Office/Occupancy, Brand, Store/Gadgets, Manifest and artifact lineage. Institutional Authority and consequence live in the Super Bundle.\n${END}`;
}

function stripExisting(text) {
  const s = text.indexOf(START), e = text.indexOf(END);
  if (s !== -1 && e !== -1 && e > s) {
    const after = e + END.length;
    text = (text.slice(0,s).replace(/\s+$/,'') + '\n\n' + text.slice(after).replace(/^\s+/,''));
  }
  text = text.replace(/\n*---\n\nCopyright © 2026 PowerFarm\. All rights reserved\.\s*$/,'').replace(/\s+$/,'') + '\n';
  return text;
}

function normalize(file) {
  const rel = posix(path.relative(root, file));
  if (isExcluded(rel)) return;
  let text = stripExisting(fs.readFileSync(file, 'utf8'));
  const lines = text.split('\n');
  let idx = lines.findIndex(l => /^#\s+/.test(l));
  if (idx < 0) idx = 0;
  const block = mapBlock(rel).split('\n');
  if (/^#\s+/.test(lines[idx] || '')) {
    let insertAt = idx + 1;
    if ((lines[insertAt] ?? '').trim() !== '') lines.splice(insertAt, 0, '');
    insertAt += 1;
    lines.splice(insertAt, 0, ...block, '');
  } else lines.splice(0, 0, ...block, '');
  text = lines.join('\n').replace(/\s+$/,'') + `\n\n---\n\n${COPYRIGHT}\n`;
  fs.writeFileSync(file, text);
}

for (const file of allMarkdown(root)) normalize(file);
console.log(`Normalized PowerFarm Markdown under ${root}`);
