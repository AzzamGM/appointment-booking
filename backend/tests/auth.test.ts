// TODO_TESTS section 1: POST /api/auth/signup and POST /api/auth/login.
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();

/** A user who can actually log in over HTTP (real bcrypt hash, low rounds for speed). */
async function createLoginUser(role: Role, email: string) {
  const passwordHash = await bcrypt.hash('password123', 4);
  return prisma.user.create({
    data: { email, passwordHash, fullName: `Seeded ${role.toLowerCase()}`, role },
  });
}

describe('POST /api/auth/signup', () => {
  it('returns 201 with a token and the public user, never the passwordHash', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'new@test.local', password: 'password123', fullName: 'New Patient' });

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({
      email: 'new@test.local',
      fullName: 'New Patient',
      role: 'PATIENT',
    });
    // Not just user.passwordHash — the hash must not appear ANYWHERE.
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('always creates a PATIENT, even if the request sneaks in a role', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'sneaky@test.local',
        password: 'password123',
        fullName: 'Wannabe Staff',
        role: 'STAFF', // privilege-escalation attempt; must be ignored
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('PATIENT');
    const inDb = await prisma.user.findUniqueOrThrow({ where: { email: 'sneaky@test.local' } });
    expect(inDb.role).toBe('PATIENT');
  });

  it('returns 409 for an already-registered email', async () => {
    const body = { email: 'dupe@test.local', password: 'password123', fullName: 'First' };
    await request(app).post('/api/auth/signup').send(body);

    const res = await request(app).post('/api/auth/signup').send({ ...body, fullName: 'Second' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already exists/i);
  });

  it('returns 400 with field details for a short password and a bad email', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'not-an-email', password: 'short', fullName: 'Bad Input' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toContain('email');
    expect(paths).toContain('password');
  });
});

describe('POST /api/auth/login', () => {
  it('works for all three roles and the token carries the right role', async () => {
    await createLoginUser('PATIENT', 'patient@test.local');
    await createLoginUser('STAFF', 'staff@test.local');
    await createLoginUser('DOCTOR', 'doctor@test.local');

    for (const [email, role] of [
      ['patient@test.local', 'PATIENT'],
      ['staff@test.local', 'STAFF'],
      ['doctor@test.local', 'DOCTOR'],
    ] as const) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe(role);
      const payload = jwt.decode(res.body.token) as { sub: string; role: string };
      expect(payload.role).toBe(role);
      expect(payload.sub).toBe(res.body.user.id);
    }
  });

  it('returns 401 for a wrong password, with the SAME message as an unknown email', async () => {
    // Same message on purpose: if the two cases differed, the endpoint would
    // double as an email-enumeration oracle ("this address has an account").
    await createLoginUser('PATIENT', 'known@test.local');

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'known@test.local', password: 'wrong-password' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.local', password: 'password123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });
});
