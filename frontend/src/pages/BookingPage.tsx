import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { SPECIALTIES, specialtyLabel } from '../lib/labels';
import { doctorAvatar, img, specialtyIcon } from '../lib/images';
import Pic from '../components/Pic';
import Loading from '../components/Loading';
import StepBadge from '../components/StepBadge';
import { revealStep } from '../lib/scroll';
import { btnGhost, btnPrimary, card, errorText, mutedText, pageTitle } from '../lib/ui';
import type { Clinic, Doctor, Specialty } from '../types';

export default function BookingPage() {
  const navigate = useNavigate();
  const [clinicCode, setClinicCode] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const specialtyStepRef = useRef<HTMLElement>(null);
  const doctorStepRef = useRef<HTMLElement>(null);

  const clinics = useQuery({
    queryKey: ['clinics'],
    queryFn: () => api<{ clinics: Clinic[] }>('/clinics'),
  });

  const doctors = useQuery({
    queryKey: ['doctors'],
    queryFn: () => api<{ doctors: Doctor[] }>('/doctors'),
  });

  const selectedClinic = clinics.data?.clinics.find((c) => c.code === clinicCode);

  const atClinic = useMemo(
    () =>
      (doctors.data?.doctors ?? []).filter(
        (d) => !clinicCode || d.clinics.some((c) => c.code === clinicCode),
      ),
    [doctors.data, clinicCode],
  );

  const bySpecialty = useMemo(() => {
    const map = new Map<Specialty, Doctor[]>();
    for (const d of atClinic) {
      map.set(d.specialty, [...(map.get(d.specialty) ?? []), d]);
    }
    return map;
  }, [atClinic]);

  const shortlist = specialty ? (bySpecialty.get(specialty) ?? []) : [];

  const chooseClinic = (code: string) => {
    setClinicCode(code);
    setSpecialty(null);
  };

  useEffect(() => {
    if (clinicCode) revealStep(specialtyStepRef);
  }, [clinicCode]);

  useEffect(() => {
    if (specialty) revealStep(doctorStepRef);
  }, [specialty]);

  return (
    <div>
      <h1 className={pageTitle}>Book an appointment</h1>
      <p className={`mt-1 ${mutedText}`}>
        Pick a branch and what you need, then choose the doctor you'd like to see.
      </p>

      {doctors.isError && (
        <p className={`mt-4 ${errorText}`}>
          Failed to load doctors: {(doctors.error as ApiError).message}
        </p>
      )}

      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
          <StepBadge n={1} /> Pick a location
          <Pic src={img.locationPin} className="h-5 w-5" />
        </h2>

        {selectedClinic ? (
          <div className={`${card} flex flex-wrap items-center gap-3 p-4`}>
            <Pic src={img.mapLocation} className="h-10 w-10" />
            <div className="flex-1">
              <p className="font-semibold">
                {selectedClinic.name}, {selectedClinic.city}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500">
                {atClinic.length} {atClinic.length === 1 ? 'doctor' : 'doctors'} at this branch
              </p>
            </div>
            <button
              onClick={() => {
                setClinicCode(null);
                setSpecialty(null);
              }}
              className={`flex items-center gap-1.5 ${btnGhost}`}
            >
              Change
            </button>
          </div>
        ) : clinics.isLoading ? (
          <Loading text="Loading locations..." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(clinics.data?.clinics ?? []).map((c) => {
              const count = (doctors.data?.doctors ?? []).filter((d) =>
                d.clinics.some((dc) => dc.code === c.code),
              ).length;
              return (
                <button
                  key={c.code}
                  onClick={() => chooseClinic(c.code)}
                  className={`${card} rise flex items-center gap-3 p-4 text-left hover:-translate-y-0.5`}
                >
                  <Pic src={img.mapLocation} className="h-12 w-12 shrink-0" />
                  <span className="min-w-0">
                    <span className="block font-semibold">{c.name}</span>
                    <span className="block text-xs text-stone-500 dark:text-stone-400">
                      {c.address}, {c.city}
                    </span>
                    <span className="block text-xs text-stone-400 dark:text-stone-500">
                      {count} {count === 1 ? 'doctor' : 'doctors'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {clinicCode && (
      <section ref={specialtyStepRef} className="rise mt-6 scroll-mt-20">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
          <StepBadge n={2} /> Choose a specialty
        </h2>

        {specialty ? (
          <div className={`${card} flex flex-wrap items-center gap-3 p-4`}>
            <Pic src={specialtyIcon[specialty]} className="h-10 w-10" />
            <div className="flex-1">
              <p className="font-semibold">{specialtyLabel(specialty)}</p>
              <p className="text-xs text-stone-400 dark:text-stone-500">
                {shortlist.length} {shortlist.length === 1 ? 'doctor' : 'doctors'} available
              </p>
            </div>
            <button onClick={() => setSpecialty(null)} className={btnGhost}>
              Change
            </button>
          </div>
        ) : doctors.isLoading ? (
          <Loading text="Loading specialties..." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SPECIALTIES.map((s) => {
              const count = bySpecialty.get(s)?.length ?? 0;
              const empty = count === 0;
              return (
                <button
                  key={s}
                  disabled={empty}
                  onClick={() => setSpecialty(s)}
                  className={`${card} rise flex flex-col items-center gap-2 p-4 text-center ${
                    empty ? 'cursor-not-allowed opacity-50' : 'hover:-translate-y-0.5'
                  }`}
                >
                  <Pic src={specialtyIcon[s]} className="h-14 w-14" />
                  <span className="text-sm font-semibold">{specialtyLabel(s)}</span>
                  <span className="text-xs text-stone-400 dark:text-stone-500">
                    {empty ? 'None available' : `${count} ${count === 1 ? 'doctor' : 'doctors'}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
      )}

      {specialty && (
      <section ref={doctorStepRef} className="rise mt-6 scroll-mt-20">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
          <StepBadge n={3} /> Choose a doctor
        </h2>

        <div className="space-y-3">
          {shortlist.map((d, i) => (
            <div
              key={d.id}
              className={`${card} rise group flex flex-wrap items-center gap-4 p-4 sm:p-5`}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <Pic
                src={doctorAvatar(d.name)}
                alt=""
                fit="cover"
                className="h-16 w-16 shrink-0 rounded-full bg-teal-50 transition-transform group-hover:scale-105 dark:bg-teal-500/10"
              />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold">{d.name}</p>
                {d.bio && <p className={`mt-0.5 ${mutedText}`}>{d.bio}</p>}
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-400 dark:text-stone-500">
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
                className={`flex w-full items-center justify-center gap-2 sm:w-auto ${btnPrimary}`}
              >
                <Pic src={img.addCalendar} className="h-5 w-5" />
                Pick a time
              </button>
            </div>
          ))}
        </div>
      </section>
      )}

      <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
        Looking for someone specific?{' '}
        <Link
          to="/doctors"
          className="inline-flex items-center gap-1 align-middle font-medium text-teal-700 underline underline-offset-2 hover:no-underline dark:text-teal-400"
        >
          <Pic src={img.search} className="h-5 w-5" />
          Browse all doctors
        </Link>
      </p>
    </div>
  );
}
