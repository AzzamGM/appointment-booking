import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { SPECIALTIES, specialtyLabel } from '../lib/labels';
import { doctorAvatar, img, specialtyIcon } from '../lib/images';
import Pic from '../components/Pic';
import Loading from '../components/Loading';
import Select from '../components/Select';
import {
  btnGhost,
  btnPrimary,
  card,
  errorText,
  inputWithIcon,
  label,
  mutedText,
  pageTitle,
} from '../lib/ui';
import type { Clinic, Doctor, Specialty } from '../types';

const HEALTH_TIPS: Array<{ icon: string; text: string }> = [
  { icon: img.virus, text: 'Flu season is coming — screenings are available at every clinic.' },
  { icon: img.lungs, text: 'Breathe easy: lung function checks take under 15 minutes.' },
  { icon: img.physicalCheck, text: 'A blood pressure check is free with any visit.' },
  { icon: img.medicine, text: 'Bring your current medication list to your appointment.' },
  { icon: img.injection, text: 'Flu shots are walk-in at both clinics, no appointment needed.' },
  { icon: img.xray, text: 'On-site imaging: most X-rays are read the same day.' },
  { icon: img.weighingScale, text: 'Ask the front desk for a weight and BMI check at your visit.' },
];

function HealthTips() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % HEALTH_TIPS.length), 6000);
    return () => clearInterval(t);
  }, []);
  const tip = HEALTH_TIPS[i];
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-teal-200/60 bg-teal-50/60 px-4 py-2.5 dark:border-teal-800/40 dark:bg-teal-500/5">
      <Pic key={i} src={tip.icon} className="rise h-7 w-7" />
      <p key={`t${i}`} className="rise text-sm text-teal-900 dark:text-teal-200">
        {tip.text}
      </p>
    </div>
  );
}

function DoctorSkeleton() {
  return (
    <div className={`${card} flex items-center gap-4 p-4`}>
      <div className="h-16 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-58 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
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
      <p className={`mt-1 ${mutedText}`}>
        Browse the clinic network and book a visit in a couple of clicks.
      </p>

      <HealthTips />

      <div className={`${card} relative z-20 mt-4 p-4 sm:p-5`}>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <Pic src={img.filter} className="h-6 w-6" />
          Filter doctors
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <span className={label}>Specialty</span>
            <Select
              value={specialty}
              onChange={(v) => setSpecialty(v as Specialty | '')}
              options={[
                { value: '', label: 'All specialties' },
                ...SPECIALTIES.map((s) => ({ value: s, label: specialtyLabel(s) })),
              ]}
            />
          </div>
          <div>
            <span className={label}>Clinic</span>
            <Select
              value={clinic}
              onChange={setClinic}
              options={[
                { value: '', label: 'All clinics' },
                ...(clinics.data?.clinics ?? []).map((c) => ({
                  value: c.code,
                  label: `${c.name} (${c.city})`,
                })),
              ]}
            />
          </div>
          <label className="block">
            <span className={label}>Name</span>
            <div className="relative">
              <Pic
                src={img.search}
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 opacity-60"
              />
              <input
                className={inputWithIcon}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name..."
              />
            </div>
          </label>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {doctors.isLoading && (
          <>
            <Loading text="Finding doctors..." inline />
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
            <Pic src={img.questionMark} className="h-12 w-12 opacity-80" />
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
            <Pic
              src={doctorAvatar(d.name)}
              alt=""
              fit="cover"
              className="h-16 w-16 shrink-0 rounded-full bg-teal-50 transition-transform group-hover:scale-105 dark:bg-teal-500/10"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-lg font-semibold">{d.name}</span>
                <span className="flex items-center gap-1.5 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  <Pic src={specialtyIcon[d.specialty]} className="h-4.5 w-4.5" />
                  {specialtyLabel(d.specialty)}
                </span>
              </div>
              {d.bio && <p className={`mt-0.5 ${mutedText}`}>{d.bio}</p>}
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400 dark:text-slate-500">
                {d.clinics.map((c) => (
                  <span key={c.code} className="flex items-center gap-1">
                    <Pic src={img.locationPin} className="h-4 w-4" />
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
