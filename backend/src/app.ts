// Express app assembly. Exported as a factory (instead of listening here)
// so tests can drive it with supertest without opening a port.
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes';
import { doctorsRouter } from './routes/doctors.routes';
import { appointmentsRouter, auditRouter, patientsRouter } from './routes/appointments.routes';
import { clinicsRouter, servicesRouter } from './routes/meta.routes';
import { errorHandler, notFoundHandler } from './middleware/errors';

export function createApp() {
  const app = express();

  // Wide-open CORS is fine for local learning; a real deployment would pin
  // allowed origins. (The Vite dev server also proxies /api, which sidesteps
  // CORS entirely in dev.)
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/doctors', doctorsRouter);
  app.use('/api/appointments', appointmentsRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/clinics', clinicsRouter);
  app.use('/api/services', servicesRouter);

  // Order matters: 404 catch-all after every real route, error handler last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
