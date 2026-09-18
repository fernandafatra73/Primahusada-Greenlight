import { config } from 'dotenv';
import { computeActivationCode, parseRequestCode } from '../src/lib/activation.js';

config({ path: new URL('../.env', import.meta.url), override: true });

const input = process.argv[2];
if (!input) {
  console.error('Pemakaian: npm run activation:code -- "<kode-permintaan-dari-klinik>"');
  console.error('');
  console.error('Contoh kode permintaan yang dikirim klinik lewat WhatsApp: cmxxxxxxxxxxxxxxxxx.1');
  process.exit(1);
}

const parsed = parseRequestCode(input);
if (!parsed) {
  console.error('Format kode permintaan tidak valid. Harus berupa "<installId>.<cycle>".');
  process.exit(1);
}

const code = computeActivationCode(parsed.installId, parsed.cycle);
console.log('');
console.log(`Kode aktivasi untuk dibalas ke klinik via WhatsApp:`);
console.log('');
console.log(`  ${code}`);
console.log('');
