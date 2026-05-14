import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUERY_FILE = join(__dirname, 'graphql/page-create.graphql');

const args = process.argv.slice(2);
const storeArg = args.find((a) => a.startsWith('--store='))?.split('=')[1];

if (!storeArg) {
  console.error('Usage: node scripts/create-size-guide-pages.js --store=<myshopify-domain>');
  console.error('  e.g. node scripts/create-size-guide-pages.js --store=linen-house.myshopify.com');
  process.exit(1);
}

// Handle generation mirrors the Liquid logic in variant-main-picker.liquid:
// product.type | downcase | replace: ' & ', '-' | replace: ' + ', '-'
//   | replace: ' - ', '-' | replace: '™', '' | replace: ' ', '-'
//   | prepend: 'size-guide-'
function toHandle(productType) {
  return 'size-guide-' + productType
    .toLowerCase()
    .replace(/ & /g, '-')
    .replace(/ \+ /g, '-')
    .replace(/ - /g, '-')
    .replace(/™/g, '')
    .replace(/ /g, '')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const placeholder = (title) => `<h2>${title}</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th></tr>
  </thead>
  <tbody>
    <tr><td>—</td><td>—</td><td>—</td></tr>
  </tbody>
</table>
<p>Placeholder — update with correct measurements before publishing.</p>`;

const CONTENT = {
  'Quilt Cover Set': `<h2>Quilt Cover Sizes</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th></tr>
  </thead>
  <tbody>
    <tr><td>Single</td><td>140cm</td><td>210cm</td></tr>
    <tr><td>Double</td><td>180cm</td><td>210cm</td></tr>
    <tr><td>Queen</td><td>210cm</td><td>210cm</td></tr>
    <tr><td>King</td><td>245cm</td><td>210cm</td></tr>
    <tr><td>Super King</td><td>270cm</td><td>240cm</td></tr>
  </tbody>
</table>
<p>Linen House's quilt covers always come as a set that includes pillowcases. The quilt cover set sizes range from single quilt cover, double quilt cover, queen quilt cover, king quilt cover, and super king quilt cover. For a king single bed, use a double bed quilt cover.</p>`,

  'Fitted Sheet': `<h2>Fitted Sheet Sizes</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th><th>Depth</th></tr>
  </thead>
  <tbody>
    <tr><td>Single</td><td>91cm</td><td>190cm</td><td>40cm</td></tr>
    <tr><td>King Single</td><td>107cm</td><td>203cm</td><td>33cm</td></tr>
    <tr><td>Double</td><td>137cm</td><td>190cm</td><td>40–50cm</td></tr>
    <tr><td>Queen</td><td>152cm</td><td>203cm</td><td>40–50cm</td></tr>
    <tr><td>King</td><td>180cm</td><td>203cm</td><td>40–50cm</td></tr>
    <tr><td>Super King</td><td>203cm</td><td>203cm</td><td>50cm</td></tr>
  </tbody>
</table>
<p>The depth of Linen House fitted sheets will vary between 40–50cm. Fitted sheets can be bought individually or as part of a sheet set.</p>`,

  'Flat Sheet': `<h2>Flat Sheet Sizes</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th></tr>
  </thead>
  <tbody>
    <tr><td>Single</td><td>180cm</td><td>254cm</td></tr>
    <tr><td>King Single</td><td>180cm</td><td>270cm</td></tr>
    <tr><td>Double</td><td>239cm</td><td>254cm</td></tr>
    <tr><td>Queen</td><td>245cm</td><td>270cm</td></tr>
    <tr><td>King</td><td>275cm</td><td>270cm</td></tr>
    <tr><td>Super King</td><td>300cm</td><td>330cm</td></tr>
  </tbody>
</table>
<p>Flat sheets can be bought individually or as part of a sheet set.</p>`,

  'Sheet Set': `<h2>Fitted Sheet Sizes</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th><th>Depth</th></tr>
  </thead>
  <tbody>
    <tr><td>Single</td><td>91cm</td><td>190cm</td><td>40cm</td></tr>
    <tr><td>King Single</td><td>107cm</td><td>203cm</td><td>33cm</td></tr>
    <tr><td>Double</td><td>137cm</td><td>190cm</td><td>40–50cm</td></tr>
    <tr><td>Queen</td><td>152cm</td><td>203cm</td><td>40–50cm</td></tr>
    <tr><td>King</td><td>180cm</td><td>203cm</td><td>40–50cm</td></tr>
    <tr><td>Super King</td><td>203cm</td><td>203cm</td><td>50cm</td></tr>
  </tbody>
</table>
<h2>Flat Sheet Sizes</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th></tr>
  </thead>
  <tbody>
    <tr><td>Single</td><td>180cm</td><td>254cm</td></tr>
    <tr><td>King Single</td><td>180cm</td><td>270cm</td></tr>
    <tr><td>Double</td><td>239cm</td><td>254cm</td></tr>
    <tr><td>Queen</td><td>245cm</td><td>270cm</td></tr>
    <tr><td>King</td><td>275cm</td><td>270cm</td></tr>
    <tr><td>Super King</td><td>300cm</td><td>330cm</td></tr>
  </tbody>
</table>
<h2>Pillowcase Sizes</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th></tr>
  </thead>
  <tbody>
    <tr><td>Standard</td><td>48cm</td><td>73cm</td></tr>
    <tr><td>European</td><td>65cm</td><td>65cm</td></tr>
  </tbody>
</table>`,

  'Fitted Sheet + Pillowcase': `<h2>Fitted Sheet Sizes</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th><th>Depth</th></tr>
  </thead>
  <tbody>
    <tr><td>Single</td><td>91cm</td><td>190cm</td><td>40cm</td></tr>
    <tr><td>King Single</td><td>107cm</td><td>203cm</td><td>33cm</td></tr>
    <tr><td>Double</td><td>137cm</td><td>190cm</td><td>40–50cm</td></tr>
    <tr><td>Queen</td><td>152cm</td><td>203cm</td><td>40–50cm</td></tr>
    <tr><td>King</td><td>180cm</td><td>203cm</td><td>40–50cm</td></tr>
    <tr><td>Super King</td><td>203cm</td><td>203cm</td><td>50cm</td></tr>
  </tbody>
</table>
<h2>Pillowcase Sizes</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th></tr>
  </thead>
  <tbody>
    <tr><td>Standard</td><td>48cm</td><td>73cm</td></tr>
    <tr><td>European</td><td>65cm</td><td>65cm</td></tr>
  </tbody>
</table>`,

  'Standard Pillowcase': `<h2>Pillowcase Sizes</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th></tr>
  </thead>
  <tbody>
    <tr><td>Standard</td><td>48cm</td><td>73cm</td></tr>
    <tr><td>European</td><td>65cm</td><td>65cm</td></tr>
    <tr><td>Queen</td><td>50cm</td><td>80cm</td></tr>
    <tr><td>King</td><td>50cm</td><td>90cm</td></tr>
  </tbody>
</table>
<p>Linen House sizing is based on standard Australian sizing. Other manufacturers may differ.</p>`,

  'European Pillowcase': `<h2>Pillowcase Sizes</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th></tr>
  </thead>
  <tbody>
    <tr><td>Standard</td><td>48cm</td><td>73cm</td></tr>
    <tr><td>European</td><td>65cm</td><td>65cm</td></tr>
    <tr><td>Queen</td><td>50cm</td><td>80cm</td></tr>
    <tr><td>King</td><td>50cm</td><td>90cm</td></tr>
  </tbody>
</table>
<p>Linen House sizing is based on standard Australian sizing. Other manufacturers may differ.</p>`,

  'Pillowcase - Silk': `<h2>Pillowcase Sizes</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th></tr>
  </thead>
  <tbody>
    <tr><td>Standard</td><td>48cm</td><td>73cm</td></tr>
    <tr><td>European</td><td>65cm</td><td>65cm</td></tr>
  </tbody>
</table>`,

  'Pillow Sham': `<h2>Pillow Sham Sizes</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th></tr>
  </thead>
  <tbody>
    <tr><td>Pillow Sham</td><td>50cm</td><td>75cm</td></tr>
  </tbody>
</table>
<p>Linen House's shams generally come in a set of two and have coordinating coverlets.</p>`,

  'Coverlet': `<h2>Coverlet Sizes</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th></tr>
  </thead>
  <tbody>
    <tr><td>Coverlet</td><td>240cm</td><td>260cm</td></tr>
  </tbody>
</table>
<p>Linen House's coverlets are a standard size suitable for all bed sizes — they fit a queen bed perfectly.</p>`,

  'Coverlet Set': `<h2>Coverlet Sizes</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th></tr>
  </thead>
  <tbody>
    <tr><td>Coverlet</td><td>240cm</td><td>260cm</td></tr>
  </tbody>
</table>
<h2>Pillow Sham Sizes</h2>
<table>
  <thead>
    <tr><th></th><th>Width</th><th>Length</th></tr>
  </thead>
  <tbody>
    <tr><td>Pillow Sham</td><td>50cm</td><td>75cm</td></tr>
  </tbody>
</table>
<p>Coverlet sets include a coverlet and coordinating pillow shams. Linen House's coverlets fit a queen bed perfectly and are suitable for all bed sizes.</p>`,
};

const PRODUCT_TYPES = [
  // Bedding
  'Quilt Cover Set',
  'Sheet Set',
  'Fitted Sheet',
  'Flat Sheet',
  'Fitted Sheet + Pillowcase',
  'Coverlet',
  'Coverlet Set',
  'Cot Coverlet',
  'Blanket',
  'Electric Blanket',
  'Mattress Protector',
  'Valance & Bedwrap™',
  // Pillows
  'Standard Pillowcase',
  'European Pillowcase',
  'Pillow Sham',
  'Pillow',
  'Pillow Protector',
  'Pillowcase - Silk',
  // Towels & Bath
  'Bath Towel',
  'Bath Sheet',
  'Bath Mat',
  'Bath Runner',
  'Hand Towel',
  'Face Washer',
  'Beach Towel',
  // Apparel
  'Robe',
  'Pyjama Set',
  'Dress',
  'Pants',
  'Shirt',
  'Shorts',
  'Cami',
];

const PAGES = PRODUCT_TYPES.map((type) => ({
  title: `Size Guide — ${type}`,
  handle: toHandle(type),
  body: CONTENT[type] ?? placeholder(type),
}));

let created = 0;
let skipped = 0;
let failed = 0;

for (const page of PAGES) {
  const hasRealContent = Boolean(CONTENT[page.title.replace('Size Guide — ', '')]);
  process.stdout.write(`→ ${page.handle} ${hasRealContent ? '' : '(placeholder)'}... `);

  const vars = {
    title: page.title,
    handle: page.handle,
    templateSuffix: null,
    body: page.body,
  };

  const tmpFile = join(__dirname, `tmp-vars-${page.handle}.json`);
  writeFileSync(tmpFile, JSON.stringify(vars));

  try {
    const result = execSync(
      `shopify store execute \
        --store ${storeArg} \
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
      console.log(`✓ created`);
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
}

console.log(`\nDone: ${created} created, ${skipped} skipped, ${failed} failed`);
