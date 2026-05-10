import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE = 'linen-house-au.myshopify.com';
const QUERY_FILE = join(__dirname, 'graphql/page-create.graphql');
const SCRAPER = join(__dirname, 'lib/scrape-content.py');

const BASE = 'https://www.linenhouse.com';

// Pages missing from Shopify — sourced from Dan's May 2026 audit
// sourceUrl: live LH page to scrape content from
// needsCustomTemplate: flagged for future template work (content still imported)
const PAGES = [
  // Customer Care
  { title: 'Privacy Policy',      handle: 'privacy-policy',          sourceUrl: `${BASE}/privacy-policy` },

  // Shopping With Us
  { title: 'Outlets & Stockists', handle: 'outlets-stockists',       sourceUrl: `${BASE}/info/outlets-stockists`, needsCustomTemplate: 'Store locator / map embed' },
  { title: 'Afterpay',            handle: 'afterpay-and-linenhouse', sourceUrl: `${BASE}/afterpay-and-linenhouse` },

  // Help & Info
  { title: 'FAQ',                 handle: 'faq',                     sourceUrl: `${BASE}/faq`,             needsCustomTemplate: 'Accordion layout' },
  { title: 'Terms & Conditions',  handle: 'terms-conditions',        sourceUrl: `${BASE}/terms-conditions` },
  { title: 'APC Plan',            handle: 'apc-plan',                sourceUrl: `${BASE}/apc-plan` },

  // More From LH
  { title: 'Our Mission',         handle: 'our-mission',             sourceUrl: `${BASE}/our-mission`,     needsCustomTemplate: 'Brand hero + multi-section layout' },
  { title: 'Sustainability',      handle: 'sustainability',          sourceUrl: `${BASE}/sustainability`,  needsCustomTemplate: 'Brand hero + multi-section layout' },
  { title: 'Giving Back',         handle: 'giving-back',             sourceUrl: `${BASE}/giving-back`,     needsCustomTemplate: 'Brand hero + image-led layout' },
  { title: 'Reviews',             handle: 'reviews',                 sourceUrl: `${BASE}/reviews` },
  { title: 'Careers',             handle: 'careers',                 sourceUrl: `${BASE}/careers` },
  { title: 'Affiliates',          handle: 'affiliates',              sourceUrl: null },

  // Rewards
  { title: 'Housemates Rewards',  handle: 'housemates',              sourceUrl: `${BASE}/housemates`,      needsCustomTemplate: 'Yotpo loyalty embed' },
  { title: 'Student Beans',       handle: 'student-beans',           sourceUrl: `${BASE}/student-beans` },
];

function scrapeContent(url) {
  if (!url) return '';
  try {
    const html = execSync(`python3 "${SCRAPER}" "${url}"`, {
      encoding: 'utf8',
      timeout: 20000,
    });
    return html.trim();
  } catch (err) {
    console.warn(`  ⚠ Could not scrape ${url}: ${err.message.split('\n')[0]}`);
    return '';
  }
}

let created = 0;
let skipped = 0;
let failed = 0;
const needsTemplate = [];

for (const page of PAGES) {
  process.stdout.write(`→ ${page.title} (${page.handle})... `);

  const body = scrapeContent(page.sourceUrl);

  const vars = {
    title: page.title,
    handle: page.handle,
    templateSuffix: page.templateSuffix ?? null,
    body,
  };

  // Write variables to a temp file to avoid shell-escaping issues with large HTML
  const tmpFile = join(__dirname, `tmp-vars-${page.handle}.json`);
  writeFileSync(tmpFile, JSON.stringify(vars));

  try {
    const result = execSync(
      `shopify store execute \
        --store ${STORE} \
        --query-file "${QUERY_FILE}" \
        --variable-file "${tmpFile}" \
        --allow-mutations \
        --json`,
      { encoding: 'utf8', timeout: 30000 }
    );

    const json = JSON.parse(result);
    const errors = json?.pageCreate?.userErrors ?? [];
    const createdPage = json?.pageCreate?.page;

    if (errors.length > 0) {
      console.log(`skipped — ${errors.map((e) => e.message).join(', ')}`);
      skipped++;
    } else if (createdPage) {
      const contentNote = body ? `${body.length} chars` : 'no content';
      console.log(`✓ created (${contentNote})`);
      created++;
    } else {
      console.log(`✗ unexpected response`);
      failed++;
    }
  } catch (err) {
    console.log(`✗ error: ${err.message.split('\n')[0]}`);
    failed++;
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }

  if (page.needsCustomTemplate) {
    needsTemplate.push({ handle: page.handle, title: page.title, reason: page.needsCustomTemplate });
  }
}

console.log(`\nDone: ${created} created, ${skipped} skipped, ${failed} failed`);

if (needsTemplate.length > 0) {
  console.log('\nPages flagged for custom templates (content imported, layout TBD):');
  for (const p of needsTemplate) {
    console.log(`  • ${p.handle.padEnd(24)} ${p.title} — ${p.reason}`);
  }
}
