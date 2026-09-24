import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { UPLOADS_DIR } from './lib/fileStorage.js';
import { registerAnalisaFotoAiRoutes } from './routes/analisaFotoAi.js';
import { registerAnalisaGrafikAiRoutes } from './routes/analisaGrafikAi.js';
import { registerAnalisaLabAiRoutes } from './routes/analisaLabAi.js';
import { registerAnalisaRadiologiAiRoutes } from './routes/analisaRadiologiAi.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerChartCandlesRoutes } from './routes/chartCandles.js';
import { registerChatRoutes } from './routes/chat.js';
import { registerBackupRoutes } from './routes/backup.js';
import { registerCrudRoutes } from './routes/crud.js';
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerKlinikRoutes } from './routes/klinik.js';
import { registerKoneksiPhRoutes } from './routes/koneksiPh.js';
import { registerRad2Routes } from './routes/rad2.js';
import { registerTransferRoutes } from './routes/transfer.js';
import { startCandlePatternJob } from './lib/candlePatternJob.js';
import { startDailyTradingPivotJob } from './lib/dailyTradingPivotJob.js';
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Paket produksi: frontend hasil build (apps/web/dist) disalin ke apps/api/web-dist,
// sejajar dengan folder build/ tempat file terkompilasi ini berada.
const webDistDir = join(__dirname, '..', 'web-dist');
const hasWebDist = existsSync(join(webDistDir, 'index.html'));

// Default 1MB is too small for base64-encoded logo/foto rontgen uploads.
const app = Fastify({ logger: true, bodyLimit: 16 * 1024 * 1024 });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
});

app.get('/api/health', async () => ({ ok: true }));

// Foto rontgen/USG dan file upload lain disimpan di disk (lihat lib/fileStorage.ts),
// bukan sebagai base64 di database, dan dilayani di sini sebagai file statis.
mkdirSync(UPLOADS_DIR, { recursive: true });
await app.register(fastifyStatic, { root: UPLOADS_DIR, prefix: '/uploads/' });

await registerAuthRoutes(app);
await registerBackupRoutes(app);
await registerAnalisaFotoAiRoutes(app);
await registerAnalisaRadiologiAiRoutes(app);
await registerAnalisaLabAiRoutes(app);
await registerAnalisaGrafikAiRoutes(app);
await registerChartCandlesRoutes(app);
await registerChatRoutes(app);
await registerDashboardRoutes(app);
await registerCrudRoutes(app);
await registerKlinikRoutes(app);
await registerKoneksiPhRoutes(app);
await registerRad2Routes(app);
await registerTransferRoutes(app);

if (hasWebDist) {
  await app.register(fastifyStatic, { root: webDistDir, decorateReply: false });

  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith('/api/')) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return reply.sendFile('index.html');
  });
}

try {
  await app.listen({ port, host });
  startDailyTradingPivotJob(app);
  startCandlePatternJob(app);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
