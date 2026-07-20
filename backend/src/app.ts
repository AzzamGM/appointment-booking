import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes';
import { doctorsRouter } from './routes/doctors.routes';
import {
  appointmentsRouter,
  auditRouter,
  guestAppointmentsRouter,
  patientsRouter,
} from './routes/appointments.routes';
import { clinicsRouter, servicesRouter } from './routes/meta.routes';
import { errorHandler, notFoundHandler } from './middleware/errors';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/doctors', doctorsRouter);
  app.use('/api/appointments', guestAppointmentsRouter);
  app.use('/api/appointments', appointmentsRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/clinics', clinicsRouter);
  app.use('/api/services', servicesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
