import { createApp } from './app';
import { env } from './lib/env';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`🩺 MediBook API listening on http://localhost:${env.PORT}`);
  console.log(`   Health check: http://localhost:${env.PORT}/api/health`);
});
