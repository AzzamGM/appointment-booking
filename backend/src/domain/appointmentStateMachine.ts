import { AppointmentStatus } from "@prisma/client";
import { ConflictError } from "../middleware/errors";

export function transitionAppointment(
  current: AppointmentStatus,
  to: AppointmentStatus,
): AppointmentStatus {
  switch (to) {
    case AppointmentStatus.CANCELLED:
      if (current !== AppointmentStatus.REQUESTED && current !== AppointmentStatus.CONFIRMED) {
        throw new ConflictError(
          `Cannot cancel a ${current} appointment: only REQUESTED or CONFIRMED appointments can be cancelled`,
        );
      }
      return AppointmentStatus.CANCELLED;
    case AppointmentStatus.CHECKED_IN:
      if (current !== AppointmentStatus.CONFIRMED) {
        throw new ConflictError(
          `Cannot check-in a ${current} appointment: only CONFIRMED appointments can be checked in`,
        );
      }
      return AppointmentStatus.CHECKED_IN;
    case AppointmentStatus.COMPLETED:
      if (current !== AppointmentStatus.CHECKED_IN) {
        throw new ConflictError(
          `Cannot complete an ${current} appointment: only CHECKED_IN appointments can be completed`,
        );
      }
      return AppointmentStatus.COMPLETED;
    case AppointmentStatus.CONFIRMED:
      if (current !== AppointmentStatus.REQUESTED) {
        throw new ConflictError(
          `Cannot confirm an ${current} appointment: only REQUESTED appointments can be confirmed`,
        );
      }
      return AppointmentStatus.CONFIRMED;
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
