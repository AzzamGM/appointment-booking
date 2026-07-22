import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './lib/env';
import { apiLimiter } from './middleware/rateLimit';
import { authRouter } from './routes/auth.routes';
import { doctorsRouter } from './routes/doctors.routes';
import {
  appointmentsRouter,
  auditRouter,
  guestAppointmentsRouter,
  patientsRouter,
} from './routes/appointments.routes';
import { clinicsRouter, servicesRouter } from './routes/meta.routes';
import { usersRouter } from './routes/user.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { errorHandler, notFoundHandler } from './middleware/errors';

export function createApp() {
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY_HOPS);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.use(
    cors(
      env.CORS_ORIGINS.length > 0
        ? {
            origin: (origin, cb) =>
              cb(null, !origin || env.CORS_ORIGINS.includes(origin.replace(/\/$/, ''))),
          }
        : undefined,
    ),
  );

  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', apiLimiter);

  app.use('/api/auth', authRouter);
  app.use('/api/doctors', doctorsRouter);
  app.use('/api/appointments', guestAppointmentsRouter);
  app.use('/api/appointments', appointmentsRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/clinics', clinicsRouter);
  app.use('/api/services', servicesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
