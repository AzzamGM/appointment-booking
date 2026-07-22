import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLocalize } from "../lib/i18n";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { LOCKED_STATUSES, noteLabel } from "../lib/labels";
import { firstName } from "../lib/format";
import { img, specialtyIcon, userAvatar } from "../lib/images";
import Pic from "../components/Pic";
import BackButton from "../components/BackButton";
import Loading from "../components/Loading";
import Prescriptions from "../components/Prescriptions";
import DayHeading from "../components/DayHeading";
import AppointmentCard, { MetaItem } from "../components/AppointmentCard";
import ErrorState from "../components/ErrorState";
import ConfirmDialog from "../components/ConfirmDialog";
import AppointmentFilters from "../components/AppointmentFilters";
import { groupByDay, useAppointmentCache, useAppointmentFilters } from "../lib/appointments";
import { btnDanger, btnGhost, btnGhostActive, card, mutedText, pageTitle } from "../lib/ui";
import type { Appointment } from "../types";

type DoctorAction = "IN_PROGRESS" | "COMPLETED" | "NO_SHOW";

const ACTION_COPY: Record<
  DoctorAction,
  { done: string; title: string; body: string; yes: string; busy: string; danger?: boolean }
> = {
  IN_PROGRESS: {
    done: "schedule.started",
    title: "schedule.confirmStartTitle",
    body: "schedule.confirmStartBody",
    yes: "schedule.confirmStartYes",
    busy: "schedule.starting",
  },
  COMPLETED: {
    done: "schedule.completed",
    title: "schedule.confirmCompleteTitle",
    body: "schedule.confirmCompleteBody",
    yes: "schedule.confirmCompleteYes",
    busy: "schedule.completing",
  },
  NO_SHOW: {
    done: "schedule.noShowMarked",
    title: "schedule.confirmNoShowTitle",
    body: "schedule.confirmNoShowBody",
    yes: "schedule.confirmNoShowYes",
    busy: "schedule.markingNoShow",
    danger: true,
  },
};

export default function DoctorSchedulePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const L = useLocalize();
  const toast = useToast();
  const navigate = useNavigate();
  const cache = useAppointmentCache();
  const [prescribingId, setPrescribingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{
    appointment: Appointment;
    action: DoctorAction;
  } | null>(null);

  const appointments = useQuery({
    queryKey: ["doctor-schedule"],
    enabled: user?.role === "DOCTOR",
    queryFn: () =>
      api<{ appointments: Appointment[] }>("/doctors/me/appointments"),
  });

  const all = appointments.data?.appointments ?? [];
  const filters = useAppointmentFilters(all);

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DoctorAction }) =>
      api<Appointment>(`/appointments/${id}/status`, {
        method: "PATCH",
        body: { status },
      }),
    onSuccess: (updated, vars) => {
      cache.write(updated);
      toast.success(t(ACTION_COPY[vars.status].done));
      setConfirming(null);
      cache.refresh(updated.id);
    },
    onError: (err) => {
      toast.error(errorMessage(err, t("errors.actionFailed")));
    },
  });

  const busyWith = (id: string, status: DoctorAction) =>
    changeStatus.isPending &&
    changeStatus.variables?.id === id &&
    changeStatus.variables?.status === status;

  const statusButton = (
    a: Appointment,
    action: DoctorAction,
    icon: string,
    idleLabel: string,
  ) => {
    const copy = ACTION_COPY[action];
    const busy = busyWith(a.id, action);
    return (
      <button
        className={`flex items-center gap-1.5 ${copy.danger ? btnDanger : btnGhost}`}
        disabled={changeStatus.isPending}
        onClick={() => setConfirming({ appointment: a, action })}
      >
        <Pic src={busy ? img.hourglass : icon} className={`h-5 w-5 ${busy ? "hourglass" : ""}`} />
        {busy ? t(copy.busy) : idleLabel}
      </button>
    );
  };

  const days = useMemo(() => groupByDay(filters.results), [filters.results]);

  if (user?.role !== "DOCTOR") {
    return (
      <p className="text-sm text-stone-600 dark:text-stone-300">
        {t("schedule.doctorsOnly")}
      </p>
    );
  }

  const total = all.length;

  return (
    <div>
      <BackButton />
      <h1 className={`flex items-center gap-2.5 ${pageTitle}`}>
        <Pic src={img.checkUp} className="h-10 w-10" />
        {t("schedule.title")}
      </h1>
      <p className={`mb-4 mt-1 ${mutedText}`}>
        {total > 0
          ? t("schedule.subtitle", {
              patients: filters.results.length,
              days: days.length,
            })
          : t("schedule.empty")}
      </p>

      {total > 0 && <AppointmentFilters state={filters} total={total} />}

      {appointments.isLoading && <Loading text={t("schedule.loading")} />}

      {appointments.isError && (
        <ErrorState
          title={t("schedule.loadFailed")}
          error={appointments.error}
          onRetry={() => appointments.refetch()}
          retrying={appointments.isFetching}
        />
      )}

      {appointments.data && total === 0 && (
        <div
          className={`${card} flex flex-col items-center gap-3 p-10 text-center`}
        >
          <Pic src={img.calendar} className="h-16 w-16 opacity-80" />
          <p className={mutedText}>{t("schedule.empty")}</p>
        </div>
      )}

      {total > 0 && filters.results.length === 0 && (
        <div
          className={`${card} flex flex-col items-center gap-3 p-10 text-center`}
        >
          <Pic src={img.search} className="h-12 w-12 opacity-60" />
          <p className={mutedText}>{t("filters.noMatches")}</p>
        </div>
      )}

      <div className="space-y-6">
        {days.map(([date, list]) => (
          <section key={date}>
            <DayHeading
              date={date}
              label={`${list.length} ${t(
                list.length === 1
                  ? "schedule.patientOnDay"
                  : "schedule.patientsOnDay",
              )}`}
            />

            <div className="space-y-2">
              {list.map((a, i) => {
                const canStart = a.status === "CHECKED_IN";
                const canComplete = a.status === "IN_PROGRESS";
                const canPrescribe = !LOCKED_STATUSES.includes(a.status);

                return (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    index={i}
                    avatar={userAvatar("PATIENT", a.patient.gender)}
                    name={firstName(L(a.patient.fullName, a.patient.fullNameAr))}
                    nameTitle={L(a.patient.fullName, a.patient.fullNameAr)}
                    subtitle={L(a.service.name, a.service.nameAr)}
                    meta={
                      <>
                        <MetaItem
                          icon={specialtyIcon[a.doctor.specialty]}
                          muted={false}
                        >
                          {t(`specialty.${a.doctor.specialty}`)}
                        </MetaItem>
                        <MetaItem icon={img.locationPin}>
                          {L(a.clinic.name, a.clinic.nameAr)}
                        </MetaItem>
                        {a.notes && (
                          <MetaItem icon={img.information} title={noteLabel(a.notes)}>
                            {noteLabel(a.notes)}
                          </MetaItem>
                        )}
                      </>
                    }
                    footer={
                      <>
                      <button
                        className={`flex items-center gap-1.5 ${btnGhost}`}
                        onClick={() => navigate(`/appointments/${a.id}`)}
                      >
                        <Pic src={img.view} className="h-5 w-5" />
                        {t("appointments.viewSummary")}
                      </button>
                      {canStart &&
                        statusButton(a, "IN_PROGRESS", img.inProgress, t("schedule.start"))}
                      {canComplete &&
                        statusButton(a, "COMPLETED", img.healthy, t("schedule.complete"))}
                      {canStart &&
                        statusButton(a, "NO_SHOW", img.noShow, t("schedule.noShow"))}
                        {(canPrescribe || a.prescriptions.length > 0) && (
                          <button
                            title={
                              a.prescriptions.length > 0
                                ? a.prescriptions
                                    .map((p) => p.medication)
                                    .join(", ")
                                : undefined
                            }
                            className={`flex items-center gap-1.5 ${
                              a.prescriptions.length > 0
                                ? btnGhostActive
                                : btnGhost
                            }`}
                            onClick={() =>
                              setPrescribingId((v) =>
                                v === a.id ? null : a.id,
                              )
                            }
                          >
                            <Pic src={img.medicine} className="h-5 w-5" />
                            {canPrescribe
                              ? t("schedule.prescribe")
                              : t("schedule.prescriptions")}
                            {a.prescriptions.length > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1.5 text-xs font-bold tabular-nums text-white dark:bg-teal-500 dark:text-stone-950">
                                {a.prescriptions.length}
                              </span>
                            )}
                          </button>
                        )}
                      </>
                    }
                  >
                    {prescribingId === a.id && <Prescriptions appointment={a} />}
                  </AppointmentCard>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {confirming && (
        <ConfirmDialog
          title={t(ACTION_COPY[confirming.action].title)}
          message={t(ACTION_COPY[confirming.action].body, {
            patient: L(
              confirming.appointment.patient.fullName,
              confirming.appointment.patient.fullNameAr,
            ),
          })}
          confirmLabel={t(ACTION_COPY[confirming.action].yes)}
          cancelLabel={t("common.back")}
          busyLabel={t(ACTION_COPY[confirming.action].busy)}
          icon={ACTION_COPY[confirming.action].danger ? img.caution : img.questionMark}
          tone={ACTION_COPY[confirming.action].danger ? "danger" : "primary"}
          busy={busyWith(confirming.appointment.id, confirming.action)}
          onConfirm={() =>
            changeStatus.mutate({
              id: confirming.appointment.id,
              status: confirming.action,
            })
          }
          onDismiss={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
