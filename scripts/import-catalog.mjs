/**
 * Parse arrow component catalog CSVs and generate a D1-compatible SQL seed file.
 *
 * Usage:
 *   # Dry run — parse and inspect output, no files written:
 *   node scripts/import-catalog.mjs --dry-run
 *
 *   # Inspect a specific table:
 *   node scripts/import-catalog.mjs --dry-run --only=vanes
 *
 *   # Generate scripts/catalog-seed.sql:
 *   node scripts/import-catalog.mjs
 *
 * Then seed the database:
 *   wrangler d1 execute dylaarchery --file=scripts/catalog-schema.sql
 *   wrangler d1 execute dylaarchery --file=scripts/catalog-seed.sql
 *
 * Add --local to target the local dev DB instead of production.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, "../src/assets");

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];

// ---------------------------------------------------------------------------
// CSV parser (handles quoted fields)
// ---------------------------------------------------------------------------

function parseLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text) {
  const lines = text.replace(/\r/g, "").trim().split("\n");
  const headers = parseLine(lines[0]).map((h) => h.trim());
  return lines
    .slice(1)
    .map((line) => {
      const values = parseLine(line);
      const row = {};
      headers.forEach((h, i) => {
        row[h] = (values[i] ?? "").trim();
      });
      return row;
    })
    .filter((row) => Object.values(row).some((v) => v !== ""));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a numeric value; return null if missing or unparseable. */
function num(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
}

/** Deduplicate an array by a key function. First occurrence wins. */
function dedup(arr, keyFn) {
  const seen = new Set();
  return arr.filter((item) => {
    const k = keyFn(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Strip non-ASCII junk introduced by Excel/CSV export encoding issues. */
function cleanStr(s) {
  return String(s ?? "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

// ---------------------------------------------------------------------------
// Shaft parsing
// ---------------------------------------------------------------------------

// Brands to exclude from the shaft catalog (not target products).
const SHAFT_BRAND_EXCLUSIONS = new Set(["Nexxus", "Whitewater Archery"]);

// Listed longest-first so prefix matching picks the most specific brand.
const SHAFT_BRANDS = [
  "Whitewater Archery",
  "Contact Archery",
  "Kill'n Stix",
  "Terra Firma",
  "Black Eagle",
  "Gold Tip",
  "Day Six",
  "CROSS-X",
  "Bloodsport",
  "Firenock",
  "Victory",
  "Element",
  "Easton",
  "Warhead",
  "Sirius",
  "Altra",
  "Nexxus",
  "TSA",
  "DCA",
];

// Brand aliases: normalize variations found in the CSV to a canonical brand name.
const SHAFT_BRAND_ALIASES = {
  Whitewater: "Whitewater Archery",
};

function extractShaftBrandModel(name) {
  const cleaned = cleanStr(name);
  for (const brand of SHAFT_BRANDS) {
    if (cleaned.toLowerCase().startsWith(brand.toLowerCase())) {
      const model = cleaned.slice(brand.length).trim();
      // If no model text remains, use the brand as the model name (e.g. "Nexxus")
      return { brand, model: model || brand };
    }
  }
  // Fallback: first word is brand, rest is model
  const parts = cleaned.split(" ");
  const brand = SHAFT_BRAND_ALIASES[parts[0]] ?? parts[0];
  const model = parts.slice(1).join(" ") || brand;
  return { brand, model };
}

function parseShafts() {
  const raw = fs.readFileSync(path.join(ASSETS_DIR, "arrowshafts.csv"), "utf8");
  const rows = parseCSV(raw);

  const docs = rows
    .map((r) => {
      const { brand, model } = extractShaftBrandModel(r["Shaft"] ?? "");
      return {
        brand,
        model,
        spine: num(r["Spine"]),
        id_in: num(r["ID (Inches)"]),
        od_in: num(r["OD (Inches)"]),
        gpi: num(r["Grain per Inch"]),
        wall_thickness: num(r["Wall Thickness"]),
        wall_area: num(r["Wall Area"]),
        circumference_in: num(r["Arrow Circumference"]),
        wrap_width_in: num(r["Wrap Width (in)"]),
        wrap_width_16th: num(r["Wrap Width (16th in)"]),
      };
    })
    .filter((d) => d.brand && d.model && d.spine !== null);

  return dedup(docs, (d) => `${d.brand}|${d.model}|${d.spine}`)
    .filter((d) => !SHAFT_BRAND_EXCLUSIONS.has(d.brand));
}

// ---------------------------------------------------------------------------
// Vane parsing
// ---------------------------------------------------------------------------

function parseVanes() {
  const raw = fs.readFileSync(path.join(ASSETS_DIR, "vanes.csv"), "utf8");
  const rows = parseCSV(raw);

  const docs = rows
    .map((r) => ({
      brand: cleanStr(r["Make"]),
      model: cleanStr(r["Model"]),
      length_in: num(r["Length"]),
      height_in: num(r["Height"]),
      weight_gr: num(r["Grains"]),
      // Stiffness is inconsistent (numeric, text codes, blank) — store as string
      stiffness: cleanStr(r["Stiffness"]) || null,
    }))
    .filter((d) => d.brand && d.model);

  // Dedupe by brand + model + dimensions (same vane can come in different sizes)
  return dedup(docs, (d) => `${d.brand}|${d.model}|${d.length_in}|${d.height_in}`);
}

// ---------------------------------------------------------------------------
// Nock parsing
// ---------------------------------------------------------------------------

// Listed longest-first to avoid prefix collisions.
const NOCK_BRANDS = [
  "Carbon Express / Fivics",
  "Warhead Arrow Co",
  "Essentials Archery",
  "Flying Arrow",
  "Black Eagle",
  "Carbon Express",
  "Nockturnal",
  "Flex-Fletch",
  "Gold Tip",
  "Bearpaw",
  "Beiter",
  "Bohning",
  "Victory",
  "Cross-X",
  "Easton",
  "Lumenok",
  "TopHat",
  "Altra",
  "30.06",
  "Halo",
  "Wasp",
  "AAE",
  "GT",
];

function extractNockBrandModel(description) {
  const d = cleanStr(description);
  for (const brand of NOCK_BRANDS) {
    if (d.toLowerCase().startsWith(brand.toLowerCase())) {
      return { brand, model: d.slice(brand.length).trim() };
    }
  }
  const parts = d.split(" ");
  return { brand: parts[0], model: parts.slice(1).join(" ") };
}

/**
 * Normalize the "Shaft Size" column into a nock_type enum + optional shaft_id_in.
 *
 * nock_type values:
 *   press_fit       — numeric ID (e.g. 0.166, 0.204)
 *   press_fit_large — ".204+" style (fits multiple IDs)
 *   pin             — pin nock
 *   glue_on         — glue-on nock
 *   traditional     — 11/32" style
 *   unknown         — couldn't determine
 */
function normalizeNockSize(shaftSize) {
  const s = cleanStr(shaftSize).toLowerCase();
  if (!s) return { nock_type: "unknown", shaft_id_in: null };
  if (s === "pin") return { nock_type: "pin", shaft_id_in: null };
  if (s === "glue") return { nock_type: "glue_on", shaft_id_in: null };
  if (s.includes("32")) return { nock_type: "traditional", shaft_id_in: null };
  if (s.includes("+")) return { nock_type: "press_fit_large", shaft_id_in: num(s) };
  const n = num(s);
  if (n !== null) return { nock_type: "press_fit", shaft_id_in: n };
  return { nock_type: "unknown", shaft_id_in: null };
}

function parseNocks() {
  const raw = fs.readFileSync(path.join(ASSETS_DIR, "nocks.csv"), "utf8");
  const rows = parseCSV(raw);

  const docs = rows
    .map((r) => {
      const { brand, model } = extractNockBrandModel(r["Description"] ?? "");
      const { nock_type, shaft_id_in } = normalizeNockSize(r["Shaft Size"] ?? "");
      return {
        brand,
        model,
        nock_type,
        shaft_id_in,
        weight_gr: num(r["Grains"]),
      };
    })
    .filter((d) => d.brand && d.model);

  return dedup(docs, (d) => `${d.brand}|${d.model}|${d.nock_type}|${d.shaft_id_in}`);
}

// ---------------------------------------------------------------------------
// Shared weight field parser
// ---------------------------------------------------------------------------
//
// Handles these formats (comma-separated tokens, each can be):
//   "100"       → { weight_gr: 100, weight_gr_min: null, weight_gr_max: null }
//   "70–190"    → { weight_gr: null, weight_gr_min: 70,  weight_gr_max: 190  }
//   "50–100+"   → { weight_gr: null, weight_gr_min: 50,  weight_gr_max: null } (open-ended)
//   "15, 25–100"→ two entries: one fixed (15) + one range (25–100)
//
function parseWeights(weightsStr) {
  const results = [];
  const tokens = weightsStr.split(",").map((s) => s.trim()).filter(Boolean);

  for (const token of tokens) {
    // Range, optionally open-ended: "70–190" or "25–100+"
    const rangeMatch = token.match(/^(\d+)\s*[–\-]\s*(\d+)(\+?)$/);
    if (rangeMatch) {
      results.push({
        weight_gr: null,
        weight_gr_min: +rangeMatch[1],
        weight_gr_max: rangeMatch[3] === "+" ? null : +rangeMatch[2],
      });
      continue;
    }

    // Plain number
    const n = num(token);
    if (n !== null) {
      results.push({ weight_gr: n, weight_gr_min: null, weight_gr_max: null });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Points parsing (embedded data — no CSV file)
// ---------------------------------------------------------------------------

const RAW_POINTS = [
  { category: "Field Point", product_type: "Screw-in",   brand: "Easton",      model: "Multi-Point",  weights: "100, 125",     notes: "Match practice to hunting" },
  { category: "Field Point", product_type: "Screw-in",   brand: "Pat Norris",  model: "Tool Steel",   weights: "85, 100, 120", notes: "Hardened steel" },
  { category: "Field Point", product_type: "Glue-on",    brand: "Kustom King", model: "Field Points", weights: "70–190",        notes: "Traditional archery" },
  { category: "Field Point", product_type: "Screw-on",   brand: "Allen",       model: "Bullet Point", weights: "125",           notes: "Aerodynamic" },
  { category: "Field Point", product_type: "Screw-in",   brand: "Ontsho",      model: "Field Tips",   weights: "100",           notes: "Precision tolerance" },
  { category: "Broadhead",   product_type: "Fixed",      brand: "Magnus",      model: "Stinger",      weights: "85, 100, 125", notes: "2-blade" },
  { category: "Broadhead",   product_type: "Fixed",      brand: "Muzzy",       model: "4-Blade",      weights: "100, 125",     notes: "Replaceable blades" },
  { category: "Broadhead",   product_type: "Mechanical", brand: "Rage",        model: "2-Blade",      weights: "100, 125",     notes: "Large cut" },
  { category: "Broadhead",   product_type: "Fixed",      brand: "NAP",         model: "Thunderhead",  weights: "100, 125",     notes: "Classic design" },
  { category: "Broadhead",   product_type: "Mechanical", brand: "Deer Stryke", model: "Therm-X",      weights: "100",           notes: "Expandable" },
];

function parsePoints() {
  const docs = [];
  for (const row of RAW_POINTS) {
    const base = {
      category: row.category,
      product_type: row.product_type,
      brand: row.brand,
      model: row.model,
      notes: row.notes || null,
    };
    for (const w of parseWeights(row.weights)) {
      docs.push({ ...base, ...w });
    }
  }
  return docs;
}

// ---------------------------------------------------------------------------
// Inserts parsing (embedded data — no CSV file)
// ---------------------------------------------------------------------------

const RAW_INSERTS = [
  { product_type: "HIT",      brand: "Easton",          model: "HIT Insert",           weights: "16, 50, 75",  material: "Aluminum/Steel", notes: "Industry standard" },
  { product_type: "Half-out", brand: "Easton",          model: "Match Grade Half-Out", weights: "55, 75",       material: "Aluminum/Steel", notes: "Micro shaft support" },
  { product_type: "Internal", brand: "Gold Tip",        model: "FACT System",          weights: "20, 50, 75, 100", material: "Aluminum",    notes: "Modular weights" },
  { product_type: "Internal", brand: "Victory",         model: "VAP Shok",             weights: "60, 75, 95",   material: "Stainless Steel", notes: "Heavy-duty" },
  { product_type: "Internal", brand: "Black Eagle",     model: "Brass Insert",         weights: "50, 100",      material: "Brass",          notes: "High FOC" },
  { product_type: "Outsert",  brand: "Ethics Archery",  model: "Adjustable Outsert",   weights: "50–100+",      material: "Steel/Aluminum", notes: "Premium system" },
  { product_type: "HIT",      brand: "Iron Will",       model: "HIT Insert",           weights: "15, 25–100",   material: "Titanium/Steel", notes: "High-end" },
  { product_type: "Internal", brand: "Generic",         model: "Aluminum Insert",      weights: "10–25",        material: "Aluminum",       notes: "Lightweight" },
];

function parseInserts() {
  const docs = [];
  for (const row of RAW_INSERTS) {
    const base = {
      category: "Insert",
      product_type: row.product_type,
      brand: row.brand,
      model: row.model,
      material: row.material || null,
      notes: row.notes || null,
    };
    for (const w of parseWeights(row.weights)) {
      docs.push({ ...base, ...w });
    }
  }
  return docs;
}

// ---------------------------------------------------------------------------
// SQL generation for D1
// ---------------------------------------------------------------------------

/** Escape a value for SQLite: NULL, quoted string, or bare number. */
function sqlVal(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

/** Build a single INSERT statement from a column list and a doc object. */
function insertRow(table, cols, doc) {
  const vals = cols.map((c) => sqlVal(doc[c]));
  return `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${vals.join(", ")});`;
}

function generateSQL(shafts, vanes, nocks, points, inserts) {
  const lines = [
    "-- Dyla Archery catalog seed data",
    "-- Generated by scripts/import-catalog.mjs",
    "-- Run: wrangler d1 execute dylaarchery --file=scripts/catalog-seed.sql",
    "",
    "PRAGMA foreign_keys = OFF;",
    "",
    "DELETE FROM inserts;",
    "DELETE FROM points;",
    "DELETE FROM nocks;",
    "DELETE FROM vanes;",
    "DELETE FROM shafts;",
    "",
  ];

  const shaftCols = ["brand", "model", "spine", "id_in", "od_in", "gpi",
    "wall_thickness", "wall_area", "circumference_in", "wrap_width_in", "wrap_width_16th"];
  lines.push("-- shafts");
  for (const d of shafts) lines.push(insertRow("shafts", shaftCols, d));
  lines.push("");

  const vaneCols = ["brand", "model", "length_in", "height_in", "weight_gr", "stiffness"];
  lines.push("-- vanes");
  for (const d of vanes) lines.push(insertRow("vanes", vaneCols, d));
  lines.push("");

  const nockCols = ["brand", "model", "nock_type", "shaft_id_in", "weight_gr"];
  lines.push("-- nocks");
  for (const d of nocks) lines.push(insertRow("nocks", nockCols, d));
  lines.push("");

  const pointCols = ["category", "product_type", "brand", "model",
    "weight_gr", "weight_gr_min", "weight_gr_max", "notes"];
  lines.push("-- points");
  for (const d of points) lines.push(insertRow("points", pointCols, d));
  lines.push("");

  const insertCols = ["category", "product_type", "brand", "model",
    "weight_gr", "weight_gr_min", "weight_gr_max", "material", "notes"];
  lines.push("-- inserts");
  for (const d of inserts) lines.push(insertRow("inserts", insertCols, d));
  lines.push("");
  lines.push("PRAGMA foreign_keys = ON;");
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const shafts = parseShafts();
const vanes = parseVanes();
const nocks = parseNocks();
const points = parsePoints();
const inserts = parseInserts();

console.log(`Parsed:`);
console.log(`  ${shafts.length} shafts`);
console.log(`  ${vanes.length} vanes`);
console.log(`  ${nocks.length} nocks`);
console.log(`  ${points.length} points`);
console.log(`  ${inserts.length} inserts`);

if (DRY_RUN) {
  const target = ONLY ?? "shafts";
  const samples = { shafts, vanes, nocks, points, inserts }[target] ?? shafts;
  console.log(`\n-- Sample output (${target}, first 5) --`);
  console.log(JSON.stringify(samples.slice(0, 5), null, 2));

  console.log("\n-- Shaft brands found --");
  const brands = [...new Set(shafts.map((s) => s.brand))].sort();
  brands.forEach((b) => console.log(`  ${b}`));

  console.log("\n-- Nock type breakdown --");
  const nockTypes = nocks.reduce((acc, n) => {
    acc[n.nock_type] = (acc[n.nock_type] ?? 0) + 1;
    return acc;
  }, {});
  console.log(nockTypes);

  console.log("\n-- Points breakdown --");
  const pointCats = points.reduce((acc, p) => {
    const k = `${p.category} / ${p.product_type}`;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  console.log(pointCats);

  console.log("\nDry run complete. Run without --dry-run to generate SQL.");
  process.exit(0);
}

const sql = generateSQL(shafts, vanes, nocks, points, inserts);
const outPath = path.join(__dirname, "catalog-seed.sql");
fs.writeFileSync(outPath, sql, "utf8");

const totalRows = shafts.length + vanes.length + nocks.length + points.length + inserts.length;
console.log(`\nWrote ${totalRows} rows to scripts/catalog-seed.sql`);
console.log(`\nNext steps:`);
console.log(`  1. wrangler d1 execute dylaarchery --file=scripts/catalog-schema.sql`);
console.log(`  2. wrangler d1 execute dylaarchery --file=scripts/catalog-seed.sql`);
console.log(`\nAdd --local to either command to target the local dev database instead.`);
