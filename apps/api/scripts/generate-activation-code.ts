import { config } from 'dotenv';
import {
  computeActivationCode,
  DEFAULT_ACTIVATION_YEARS,
  isValidActivationYears,
  parseRequestCode,
} from '../src/lib/activation.js';

config({ path: new URL('../.env', import.meta.url), override: true });

const input = process.argv[2];
if (!input) {
  console.error('Pemakaian: npm run activation:code -- "<kode-permintaan-dari-klinik>" [tahun]');
  console.error('');
  console.error('Contoh kode permintaan yang dikirim klinik lewat WhatsApp: cmxxxxxxxxxxxxxxxxx.1');
  console.error(`[tahun] opsional, default ${DEFAULT_ACTIVATION_YEARS} (mis. 20 untuk aktivasi jangka panjang).`);
  process.exit(1);
}

const parsed = parseRequestCode(input);
if (!parsed) {
  console.error('Format kode permintaan tidak valid. Harus berupa "<installId>.<cycle>".');
  process.exit(1);
}

const yearsArg = process.argv[3];
const years = yearsArg === undefined ? DEFAULT_ACTIVATION_YEARS : Number(yearsArg);
if (!isValidActivationYears(years)) {
  console.error('Jumlah tahun tidak valid. Harus bilangan bulat 1-100.');
  process.exit(1);
}

const code = computeActivationCode(parsed.installId, parsed.cycle, years);
console.log('');
console.log(`Kode aktivasi (berlaku ${years} tahun) untuk dibalas ke klinik via WhatsApp:`);
console.log('');
console.log(`  ${code}`);
console.log('');
