// Appointment lifecycle state machine — STUB ONLY (Gap 1 in LEARNING_GUIDE.md).
//
// The states exist (AppointmentStatus in schema.prisma):
//   REQUESTED, CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED, NO_SHOW
// What does NOT exist is the rule set for moving between them. Without it,
// nothing stops code from checking in an appointment that was never
// confirmed, or cancelling one that already happened.
//
// TODO(learn) Gap 1: implement transitionAppointment(). Suggested steps:
//
//   1. Write down the legal transitions as data, mirroring a real clinic day:
//        REQUESTED  -> CONFIRMED (staff approves) | CANCELLED
//        CONFIRMED  -> CHECKED_IN (patient arrives) | CANCELLED | NO_SHOW
//        CHECKED_IN -> COMPLETED
//        COMPLETED / CANCELLED / NO_SHOW -> terminal, nothing leaves them
//      A Record<AppointmentStatus, AppointmentStatus[]> is enough. Keeping
//      rules as data (not if/else soup) makes them printable, testable,
//      reviewable.
//
//   2. Make transitionAppointment validate `to` against that table and throw
//      a ConflictError (409) for illegal moves, with a message naming both
//      states — future-you debugging at 2am will thank present-you.
//
//   3. Wire it into the three lifecycle endpoints (all currently 501):
//        PATCH /appointments/:id/cancel     (patient or staff)
//        PATCH /appointments/:id/check-in   (staff)
//        PATCH /appointments/:id/status     (staff, generic)
//      Note a real cancel is more than a status flip: the slot must be
//      re-opened (status back to OPEN) so someone else can book it —
//      atomically, in one prisma.$transaction. A cancelled appointment whose
//      slot stays BOOKED is lost revenue and an angry patient.
//
//   4. Stretch: transitions are also ROLE-gated in real clinics — a patient
//      may cancel, but only staff may check in or mark no-show. Decide
//      whether that rule lives here (pass the actor's role in) or in the
//      routes. There are decent arguments both ways; write down yours.
//
//   5. Unit-test it (no DB needed — it's a pure function): every legal
//      transition succeeds, every illegal one throws. With 6 states there
//      are 36 pairs; a table-driven test covers them in a few lines.
import { AppointmentStatus } from "@prisma/client";
import { ConflictError } from "../middleware/errors";

// IMPLEMENTED (Gap 1 done). The rules mirror the table in the comment above:
// cancel is legal from REQUESTED or CONFIRMED; confirm only from REQUESTED;
// check-in only from CONFIRMED; complete only from CHECKED_IN; no-show only
// from CONFIRMED (the patient was expected and never arrived). COMPLETED,
// CANCELLED, and NO_SHOW are terminal.
//
// Role gating decision (step 4 above): it lives in the ROUTES via
// requireRole (cancel: patient or staff; check-in and generic status
// changes: staff only). This keeps the state machine a pure function of
// states, which makes the 36-pair table test trivial; the trade-off is that
// anyone adding a new route must remember to gate it.

/**
 * Validate and return the new status for an appointment transition.
 * @throws ConflictError when the transition is illegal
 */
export function transitionAppointment(
  current: AppointmentStatus,
  to: AppointmentStatus,
): AppointmentStatus {
  switch (to) {
    // to cancel
    case AppointmentStatus.CANCELLED:
      if (current !== AppointmentStatus.REQUESTED && current !== AppointmentStatus.CONFIRMED) {
        throw new ConflictError(
          `Cannot cancel a ${current} appointment: only REQUESTED or CONFIRMED appointments can be cancelled`,
        );
      }
      return AppointmentStatus.CANCELLED;
    // to check-in
    case AppointmentStatus.CHECKED_IN:
      if (current !== AppointmentStatus.CONFIRMED) {
        throw new ConflictError(
          `Cannot check-in a ${current} appointment: only CONFIRMED appointments can be checked in`,
        );
      }
      return AppointmentStatus.CHECKED_IN;
    // to complete
    case AppointmentStatus.COMPLETED:
      if (current !== AppointmentStatus.CHECKED_IN) {
        throw new ConflictError(
          `Cannot complete an ${current} appointment: only CHECKED_IN appointments can be completed`,
        );
      }
      return AppointmentStatus.COMPLETED;
    // to confirm
    case AppointmentStatus.CONFIRMED:
      if (current !== AppointmentStatus.REQUESTED) {
        throw new ConflictError(
          `Cannot confirm an ${current} appointment: only REQUESTED appointments can be confirmed`,
        );
      }
      return AppointmentStatus.CONFIRMED;
    // to no-show
    case AppointmentStatus.NO_SHOW:
      if (current !== AppointmentStatus.CONFIRMED) {
        throw new ConflictError(
          `Cannot no-show a ${current} appointment: only CONFIRMED appointments can be marked no-show`,
        );
      }
      return AppointmentStatus.NO_SHOW;
    default:
      throw new ConflictError(
        `Unsupported appointment status transition: ${current} → ${to}`,
      );
  }
}
