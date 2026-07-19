// Small public reference-data endpoints the frontend uses to populate
// filters and the booking form. Fully implemented.
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errors';

export const clinicsRouter = Router();

// GET /api/clinics
clinicsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const clinics = await prisma.clinic.findMany({ orderBy: { name: 'asc' } });
    res.json({
      clinics: clinics.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        address: c.address,
        city: c.city,
        phone: c.phone,
      })),
    });
  }),
);

export const servicesRouter = Router();

// GET /api/services — optionally filtered by the specialty that must perform it
servicesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const specialty = typeof req.query.specialty === 'string' ? req.query.specialty : undefined;
    const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });
    const filtered = specialty
      ? services.filter((s) => (s.specialties as string[]).includes(specialty))
      : services;
    res.json({
      services: filtered.map((s) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        price: Number(s.price),
        requiresApproval: s.requiresApproval,
        specialties: s.specialties,
      })),
    });
  }),
);
