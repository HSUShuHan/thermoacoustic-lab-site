#!/usr/bin/env node
// One-shot ORCID/Crossref → BibTeX + mdx importer.
// Hardcoded entries (combining ORCID + Crossref-supplemented authors).
// Run: node scripts/import-orcid.mjs

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB_DIR = join(ROOT, "src/content/publications");
const BIB_PATH = join(ROOT, "data/publications.bib");

// Featured: papers to highlight on home page (most recent thermoacoustic-lab-led)
const entries = [
  {
    key: "obayashi2012amplitude",
    file: "2012-obayashi-stacked-mesh.mdx",
    title:
      "Amplitude Dependence of Thermoacoustic Properties of Stacked Wire Meshes",
    authors: ["Atsushi Obayashi", "Shu-Han Hsu", "Tetsushi Biwa"],
    venue: "TEION KOGAKU (Journal of Cryogenics and Superconductivity Society of Japan)",
    venue_short: "TEION KOGAKU",
    year: 2012,
    type: "journal",
    doi: "10.2221/jcsj.47.562",
    volume: "47",
    issue: "9",
    pages: "562--567",
    tags: ["thermoacoustic", "stacked wire mesh", "regenerator"],
  },
  {
    key: "hsu2017modeling",
    file: "2017-hsu-stacked-screen-modeling.mdx",
    title: "Modeling of a stacked-screen regenerator in an oscillatory flow",
    authors: ["Shu-Han Hsu", "Tetsushi Biwa"],
    venue: "Japanese Journal of Applied Physics",
    venue_short: "JJAP",
    year: 2017,
    type: "journal",
    doi: "10.7567/jjap.56.017301",
    volume: "56",
    issue: "1",
    pages: "017301",
    tags: ["thermoacoustic", "regenerator", "modeling"],
  },
  {
    key: "hsu2017heatflow",
    file: "2017-hsu-heat-flow-regenerator.mdx",
    title:
      "Measurement of Heat Flow Transmitted through a Stacked-Screen Regenerator of Thermoacoustic Engine",
    authors: ["Shu-Han Hsu", "Tetsushi Biwa"],
    venue: "Applied Sciences",
    venue_short: "Appl. Sci.",
    year: 2017,
    type: "journal",
    doi: "10.3390/app7030303",
    volume: "7",
    issue: "3",
    pages: "303",
    tags: ["thermoacoustic", "heat flow", "regenerator", "experiment"],
  },
  {
    key: "hsu2022saturation",
    file: "2022-hsu-saturation-preprint.mdx",
    title:
      "Estimation of Saturations of Oscillatory Pressure in the Vicinity of Onset of Thermoacoustic Stirling Engine",
    authors: ["Shu-Han Hsu", "Yi-Ting Li"],
    venue: "SSRN",
    year: 2022,
    type: "preprint",
    doi: "10.2139/ssrn.4045886",
    tags: ["thermoacoustic", "Stirling engine", "onset", "limit cycle"],
  },
  {
    key: "hsu2022finite",
    file: "2022-hsu-finite-amplitude-saturation.mdx",
    title:
      "Finite-Amplitude Saturation of Self-Sustained Oscillations in a Standing Wave Thermoacoustic Engine",
    authors: ["Shu-Han Hsu"],
    venue: "Proceedings of the International Congress on Sound and Vibration (ICSV)",
    venue_short: "ICSV",
    year: 2022,
    type: "conference",
    tags: ["thermoacoustic", "standing wave", "self-sustained oscillation"],
  },
  {
    key: "hsu2023limit",
    file: "2023-hsu-limit-cycle-amplitude.mdx",
    title:
      "Estimation of limit cycle amplitude after onset threshold of thermoacoustic Stirling engine",
    authors: ["Shu-Han Hsu", "Yi-Ting Li"],
    venue: "Experimental Thermal and Fluid Science",
    venue_short: "Exp. Therm. Fluid Sci.",
    year: 2023,
    type: "journal",
    doi: "10.1016/j.expthermflusci.2023.110956",
    tags: ["thermoacoustic", "Stirling engine", "limit cycle", "experiment"],
    featured: true,
  },
  {
    key: "hsu2023onset",
    file: "2023-hsu-onset-conditions.mdx",
    title:
      "Evaluating the onset conditions of a thermoacoustic Stirling engine loaded with an audio loudspeaker",
    authors: ["Shu-Han Hsu", "Chuan-Heng Lai"],
    venue: "Frontiers in Thermal Engineering",
    venue_short: "Front. Therm. Eng.",
    year: 2023,
    type: "journal",
    doi: "10.3389/fther.2023.1241411",
    tags: ["thermoacoustic", "Stirling engine", "onset", "loudspeaker"],
  },
  {
    key: "lai2024hopf",
    file: "2024-lai-hopf-bifurcation.mdx",
    title:
      "Empirical Modeling of Subcritical Hopf Bifurcation of Thermoacoustic Stirling Engine",
    authors: ["Chuan-Heng Lai", "Shu-Han Hsu"],
    venue: "Aerospace",
    year: 2024,
    type: "journal",
    doi: "10.3390/aerospace11050347",
    tags: ["thermoacoustic", "Stirling engine", "bifurcation", "nonlinear dynamics"],
    featured: true,
  },
  {
    key: "hsu2024condensation",
    file: "2024-hsu-condensation-shock.mdx",
    title: "Condensation shock induced in wet thermoacoustic prime mover",
    authors: ["Shu-Han Hsu", "Hong-En Lin"],
    venue: "Physics of Fluids",
    venue_short: "Phys. Fluids",
    year: 2024,
    type: "journal",
    doi: "10.1063/5.0201800",
    tags: ["wet thermoacoustic", "condensation", "prime mover"],
    featured: true,
  },
  {
    key: "hsu2024impedance",
    file: "2024-hsu-impedance-matching.mdx",
    title:
      "Impedance matching for investigating operational conditions in thermoacoustic Stirling fluidic engine",
    authors: ["Shu-Han Hsu", "Zhe-Yi Liao"],
    venue: "Applied Energy",
    venue_short: "Appl. Energy",
    year: 2024,
    type: "journal",
    doi: "10.1016/j.apenergy.2024.123973",
    tags: ["thermoacoustic", "Stirling fluidic engine", "impedance matching"],
    featured: true,
  },
  {
    key: "gao2024bouncing",
    file: "2024-gao-bouncing-drops.mdx",
    title: "Bouncing Dynamics of Drops' Successive Off-Center Impact",
    authors: [
      "Shu-Rong Gao",
      "Qi-Hui Jia",
      "Zhe Liu",
      "Shi-Hua Shi",
      "Yi-Feng Wang",
      "Shao-Fei Zheng",
      "Yan-Ru Yang",
      "Shu-Han Hsu",
      "Wei-Mon Yan",
      "Xiao-Dong Wang",
    ],
    venue: "Langmuir",
    year: 2024,
    type: "journal",
    doi: "10.1021/acs.langmuir.4c00913",
    tags: ["drop dynamics", "collaboration"],
  },
  {
    key: "huang2024nanoparticle",
    file: "2024-huang-nanoparticle-compression.mdx",
    title:
      "Compression behavior of nanoparticle powder considering fractal aggregate for additive manufacturing",
    authors: ["C. Huang", "Z. Hu", "Y. Wang", "Shu-Han Hsu", "X. Wang"],
    venue: "Ceramics International",
    venue_short: "Ceram. Int.",
    year: 2024,
    type: "journal",
    doi: "10.1016/j.ceramint.2024.04.355",
    tags: ["additive manufacturing", "nanoparticle", "collaboration"],
  },
  {
    key: "chen2024aluminum",
    file: "2024-chen-al-interlayer.mdx",
    title:
      "Al interlayer enhanced interfacial strength of ultrasonically welded copper-titanium dissimilar joints",
    authors: ["I-Hsuan Chen", "Shu-Han Hsu", "Jia-Yan Lin", "Xinglong Ji"],
    venue: "Materials Letters",
    venue_short: "Mater. Lett.",
    year: 2024,
    type: "journal",
    doi: "10.1016/j.matlet.2024.136582",
    tags: ["ultrasonic welding", "materials", "collaboration"],
  },
  {
    key: "vahidhosseini2024solar",
    file: "2024-vahidhosseini-solar-thermal.mdx",
    title:
      "Integration of solar thermal collectors and heat pumps with thermal energy storage systems for building energy demand reduction: A comprehensive review",
    authors: [
      "S. M. Vahidhosseini",
      "S. Rashidi",
      "Shu-Han Hsu",
      "Wei-Mon Yan",
      "A. Rashidi",
    ],
    venue: "Journal of Energy Storage",
    venue_short: "J. Energy Storage",
    year: 2024,
    type: "journal",
    doi: "10.1016/j.est.2024.112568",
    tags: ["solar thermal", "review", "collaboration"],
  },
];

// ── BibTeX type mapping ─────────────────────────────────────────────────
const bibType = (t) =>
  ({
    journal: "article",
    conference: "inproceedings",
    thesis: "phdthesis",
    preprint: "misc",
  })[t] || "misc";

// ── Generate BibTeX entry ──────────────────────────────────────────────
const escapeBraces = (s) => s.replace(/[{}]/g, "");

const toBib = (e) => {
  const fields = [];
  fields.push(`  author    = {${e.authors.join(" and ")}}`);
  fields.push(`  title     = {{${escapeBraces(e.title)}}}`);
  if (e.type === "journal") fields.push(`  journal   = {${e.venue}}`);
  else if (e.type === "conference") fields.push(`  booktitle = {${e.venue}}`);
  else fields.push(`  howpublished = {${e.venue}}`);
  fields.push(`  year      = {${e.year}}`);
  if (e.volume) fields.push(`  volume    = {${e.volume}}`);
  if (e.issue) fields.push(`  number    = {${e.issue}}`);
  if (e.pages) fields.push(`  pages     = {${e.pages}}`);
  if (e.doi) fields.push(`  doi       = {${e.doi}}`);
  return `@${bibType(e.type)}{${e.key},\n${fields.join(",\n")}\n}`;
};

// ── Generate mdx file ──────────────────────────────────────────────────
const toMdx = (e) => {
  const yaml = [];
  yaml.push(`title: "${e.title.replace(/"/g, '\\"')}"`);
  yaml.push(`authors:`);
  for (const a of e.authors) yaml.push(`  - "${a}"`);
  yaml.push(`venue: "${e.venue}"`);
  if (e.venue_short) yaml.push(`venue_short: "${e.venue_short}"`);
  yaml.push(`year: ${e.year}`);
  yaml.push(`type: "${e.type}"`);
  if (e.doi) yaml.push(`doi: "${e.doi}"`);
  if (e.featured) yaml.push(`featured: true`);
  if (e.tags?.length) {
    yaml.push(`tags:`);
    for (const t of e.tags) yaml.push(`  - "${t}"`);
  }
  return `---\n${yaml.join("\n")}\n---\n`;
};

// ── Write files ────────────────────────────────────────────────────────
let written = 0;
let skipped = 0;
const newBibs = [];

for (const e of entries) {
  const mdxPath = join(PUB_DIR, e.file);
  if (existsSync(mdxPath)) {
    skipped++;
    continue;
  }
  writeFileSync(mdxPath, toMdx(e));
  newBibs.push(toBib(e));
  written++;
}

// Append BibTeX entries
if (newBibs.length > 0) {
  const existing = readFileSync(BIB_PATH, "utf-8");
  const sep = existing.endsWith("\n\n") ? "" : "\n\n";
  writeFileSync(BIB_PATH, existing + sep + newBibs.join("\n\n") + "\n");
}

console.log(`Wrote ${written} new mdx, skipped ${skipped} existing.`);
console.log(`Appended ${newBibs.length} BibTeX entries to ${BIB_PATH}`);
