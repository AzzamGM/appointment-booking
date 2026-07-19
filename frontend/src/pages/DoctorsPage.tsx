import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { SPECIALTIES, specialtyLabel } from '../lib/labels';
import { btnGhost, btnPrimary, card, errorText, input, label, mutedText, pageTitle, select } from '../lib/ui';
import type { Clinic, Doctor, Specialty } from '../types';

function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function DoctorSkeleton() {
  return (
    <div className={`${card} flex items-center gap-4 p-4`}>
      <div className="h-12 w-12 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="h-9 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

export default function DoctorsPage() {
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState<Specialty | ''>('');
  const [clinic, setClinic] = useState('');
  const [q, setQ] = useState('');

  const hasFilters = !!(specialty || clinic || q.trim());

  const clinics = useQuery({
    queryKey: ['clinics'],
    queryFn: () => api<{ clinics: Clinic[] }>('/clinics'),
  });

  const doctors = useQuery({
    queryKey: ['doctors', specialty, clinic, q],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (specialty) qs.set('specialty', specialty);
      if (clinic) qs.set('clinic', clinic);
      if (q.trim()) qs.set('q', q.trim());
      const query = qs.toString();
      return api<{ doctors: Doctor[] }>(`/doctors${query ? `?${query}` : ''}`);
    },
  });

  const clearFilters = () => {
    setSpecialty('');
    setClinic('');
    setQ('');
  };

  return (
    <div>
      <h1 className={pageTitle}>Find a doctor</h1>
      <p className={`mb-5 mt-1 ${mutedText}`}>
        Browse the clinic network and book a visit in a couple of clicks.
      </p>

      <div className={`${card} grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-5`}>
        <label className="block">
          <span className={label}>Specialty</span>
          <select
            className={select}
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value as Specialty | '')}
          >
            <option value="">All specialties</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {specialtyLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Clinic</span>
          <select className={select} value={clinic} onChange={(e) => setClinic(e.target.value)}>
            <option value="">All clinics</option>
            {clinics.data?.clinics.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.city})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Name</span>
          <input
            className={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name..."
          />
        </label>
      </div>

      <div className="mt-6 space-y-3">
        {doctors.isLoading && (
          <>
            <DoctorSkeleton />
            <DoctorSkeleton />
            <DoctorSkeleton />
          </>
        )}

        {doctors.isError && (
          <p className={errorText}>
            Failed to load doctors: {(doctors.error as ApiError).message}
          </p>
        )}

        {doctors.data && doctors.data.doctors.length > 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {doctors.data.doctors.length}{' '}
            {doctors.data.doctors.length === 1 ? 'doctor' : 'doctors'}
            {hasFilters ? ' match your filters' : ' available'}
          </p>
        )}

        {doctors.data?.doctors.length === 0 && (
          <div className={`${card} flex flex-col items-center gap-3 p-8 text-center`}>
            <p className={mutedText}>No doctors match those filters.</p>
            {hasFilters && (
              <button onClick={clearFilters} className={btnGhost}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {doctors.data?.doctors.map((d, i) => (
          <div
            key={d.id}
            className={`${card} rise group flex flex-wrap items-center gap-4 p-4 hover:border-teal-300 hover:shadow-md sm:p-5 dark:hover:border-teal-700`}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
              {initials(d.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-lg font-semibold">{d.name}</span>
                <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  {specialtyLabel(d.specialty)}
                </span>
              </div>
              {d.bio && <p className={`mt-0.5 ${mutedText}`}>{d.bio}</p>}
              <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-400 dark:text-slate-500">
                {d.clinics.map((c) => (
                  <span key={c.code}>
                    {c.name}, {c.city}
                  </span>
                ))}
              </p>
            </div>
            <button
              onClick={() => navigate(`/doctors/${d.id}/book`)}
              className={`w-full sm:w-auto ${btnPrimary}`}
            >
              Book appointment
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
