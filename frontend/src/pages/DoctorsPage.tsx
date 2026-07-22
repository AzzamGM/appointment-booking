import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocalize } from '../lib/i18n';
import { api } from '../lib/api';
import { SPECIALTIES } from '../lib/labels';
import { doctorAvatar, img, specialtyIcon } from '../lib/images';
import Pic from '../components/Pic';
import BackButton from '../components/BackButton';
import Loading from '../components/Loading';
import Select from '../components/Select';
import ErrorState from '../components/ErrorState';
import {
  btnGhost,
  btnAccent,
  card,
  inputWithIcon,
  label,
  mutedText,
  pageTitle,
} from '../lib/ui';
import type { Clinic, Doctor, Specialty } from '../types';

const HEALTH_TIPS: Array<{ icon: string; key: string }> = [
  { icon: img.virus, key: 'tips.t1' },
  { icon: img.lungs, key: 'tips.t2' },
  { icon: img.physicalCheck, key: 'tips.t3' },
  { icon: img.medicine, key: 'tips.t4' },
  { icon: img.injection, key: 'tips.t5' },
  { icon: img.xray, key: 'tips.t6' },
  { icon: img.weighingScale, key: 'tips.t7' },
];

function HealthTips() {
  const { t } = useTranslation();
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
        {t(tip.key)}
      </p>
    </div>
  );
}

function DoctorSkeleton() {
  return (
    <div className={`${card} flex items-center gap-4 p-4`}>
      <div className="h-16 w-16 animate-pulse rounded-full bg-stone-200 dark:bg-stone-800" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-58 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-3 w-72 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
      </div>
      <div className="h-9 w-36 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
    </div>
  );
}

export default function DoctorsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const L = useLocalize();
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
      <BackButton />
      <h1 className={pageTitle}>{t('doctors.title')}</h1>
      <p className={`mt-1 ${mutedText}`}>
        {t('doctors.subtitle')}
      </p>

      <HealthTips />

      <div className={`${card} relative z-20 mt-4 p-4 sm:p-5`}>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
          <Pic src={img.filter} className="h-6 w-6" />
          {t('doctors.filter')}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <span className={label}>{t('doctors.specialty')}</span>
            <Select
              value={specialty}
              onChange={(v) => setSpecialty(v as Specialty | '')}
              options={[
                { value: '', label: t('doctors.allSpecialties') },
                ...SPECIALTIES.map((s) => ({ value: s, label: t(`specialty.${s}`) })),
              ]}
            />
          </div>
          <div>
            <span className={label}>{t('doctors.clinic')}</span>
            <Select
              value={clinic}
              onChange={setClinic}
              options={[
                { value: '', label: t('doctors.allClinics') },
                ...(clinics.data?.clinics ?? []).map((c) => ({
                  value: c.code,
                  label: `${L(c.name, c.nameAr)} (${L(c.city, c.cityAr)})`,
                })),
              ]}
            />
          </div>
          <label className="block">
            <span className={label}>{t('doctors.name')}</span>
            <div className="relative">
              <Pic
                src={img.search}
                className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 opacity-60"
              />
              <input
                className={inputWithIcon}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('doctors.searchByName')}
              />
            </div>
          </label>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {doctors.isLoading && (
          <>
            <Loading text={t('doctors.finding')} inline />
            <DoctorSkeleton />
            <DoctorSkeleton />
            <DoctorSkeleton />
          </>
        )}

        {doctors.isError && (
          <ErrorState
            title={t('doctors.loadFailed')}
            error={doctors.error}
            onRetry={() => doctors.refetch()}
            retrying={doctors.isFetching}
          />
        )}

        {doctors.data && doctors.data.doctors.length > 0 && (
          <p className="text-xs text-stone-400 dark:text-stone-500">
            {hasFilters ? t('doctors.countMatch') : t('doctors.countAvailable')}:{' '}
            {doctors.data.doctors.length}
          </p>
        )}

        {doctors.data?.doctors.length === 0 && (
          <div className={`${card} flex flex-col items-center gap-3 p-8 text-center`}>
            <Pic src={img.questionMark} className="h-12 w-12 opacity-80" />
            <p className={mutedText}>{t('doctors.noMatch')}</p>
            {hasFilters && (
              <button onClick={clearFilters} className={btnGhost}>
                {t('doctors.clearFilters')}
              </button>
            )}
          </div>
        )}

        {doctors.data?.doctors.map((d, i) => (
          <div
            key={d.id}
            className={`${card} rise group flex flex-wrap items-center gap-4 p-4 hover:border-teal-300 sm:p-5 dark:hover:border-teal-700`}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <Pic
              src={doctorAvatar(d.name)}
              alt=""
              fit="cover"
              className="h-16 w-16 shrink-0 rounded-full bg-teal-50 ring-2 ring-teal-200 transition-transform group-hover:scale-105 dark:bg-teal-500/10 dark:ring-teal-800"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-lg font-semibold">{L(d.name, d.nameAr)}</span>
                <span className="flex items-center gap-1.5 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  <Pic src={specialtyIcon[d.specialty]} className="h-4.5 w-4.5" />
                  {t(`specialty.${d.specialty}`)}
                </span>
              </div>
              {d.bio && <p className={`mt-0.5 ${mutedText}`}>{L(d.bio, d.bioAr)}</p>}
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-400 dark:text-stone-500">
                {d.clinics.map((c) => (
                  <span key={c.code} className="flex items-center gap-1">
                    <Pic src={img.locationPin} className="h-4 w-4" />
                    {L(c.name, c.nameAr)}, {L(c.city, c.cityAr)}
                  </span>
                ))}
              </p>
            </div>
            <button
              onClick={() => navigate(`/doctors/${d.id}/book`)}
              className={`w-full sm:w-auto ${btnAccent}`}
            >
              {t('doctors.bookAppointment')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
