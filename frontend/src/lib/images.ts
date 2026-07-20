// Central registry for the hand-drawn icon set in src/assets, grouped into
// semantic maps so pages never import raw files directly.
import type { AppointmentStatus, Specialty } from '../types';

import approved from '../assets/approved.svg';
import calendar from '../assets/calendar.svg';
import cancelled from '../assets/cancelled.svg';
import cashNote from '../assets/cash-note.svg';
import checkUp from '../assets/check_up.svg';
import clock from '../assets/clock.svg';
import confirmed from '../assets/confirmed.svg';
import creditCard from '../assets/credit-card.svg';
import customerServiceAgent from '../assets/customer-service-agent.svg';
import deleteIcon from '../assets/delete.svg';
import femaleDoctor from '../assets/female_doctor.svg';
import femaleUser from '../assets/female_user.svg';
import filter from '../assets/filter.svg';
import healthy from '../assets/healthy.svg';
import hide from '../assets/hide.svg';
import home from '../assets/home.svg';
import hourglass from '../assets/hourglass.svg';
import idCard from '../assets/id-card.svg';
import information from '../assets/information.svg';
import locationPin from '../assets/location-pin.svg';
import lungs from '../assets/lungs.svg';
import maleDoctor from '../assets/male_doctor.svg';
import maleUser from '../assets/male_user.svg';
import medicine from '../assets/medicine_png.svg';
import menu from '../assets/menu.svg';
import moon from '../assets/moon.svg';
import newIcon from '../assets/new.svg';
import noShow from '../assets/no-show.svg';
import notificationBell from '../assets/notification-bell.svg';
import notification from '../assets/notification.svg';
import onlineConsultation from '../assets/online-consulation.svg';
import paymentMethod from '../assets/payment-method.svg';
import phoneCall from '../assets/phone-call.svg';
import physicalCheck from '../assets/physical_check.svg';
import questionMark from '../assets/question-mark.svg';
import save from '../assets/save.svg';
import settings from '../assets/settings.svg';
import skeleton from '../assets/skeleton.svg';
import skin from '../assets/skin.svg';
import sun from '../assets/sun.svg';
import thumbDown from '../assets/thumb-down.svg';
import thumbsUp from '../assets/thumbs-up.svg';
import unapproved from '../assets/unapproved.svg';
import unhealthy from '../assets/unhealthy.svg';
import unhide from '../assets/unhide.svg';
import virus from '../assets/virus.svg';

export const img = {
  approved,
  calendar,
  cancelled,
  cashNote,
  checkUp,
  clock,
  confirmed,
  creditCard,
  customerServiceAgent,
  delete: deleteIcon,
  femaleDoctor,
  femaleUser,
  filter,
  healthy,
  hide,
  home,
  hourglass,
  idCard,
  information,
  locationPin,
  lungs,
  maleDoctor,
  maleUser,
  medicine,
  menu,
  moon,
  new: newIcon,
  noShow,
  notification,
  notificationBell,
  onlineConsultation,
  paymentMethod,
  phoneCall,
  physicalCheck,
  questionMark,
  save,
  settings,
  skeleton,
  skin,
  sun,
  thumbDown,
  thumbsUp,
  unapproved,
  unhealthy,
  unhide,
  virus,
} as const;

/** One sketch icon per appointment lifecycle state. */
export const statusIcon: Record<AppointmentStatus, string> = {
  REQUESTED: newIcon,
  CONFIRMED: confirmed,
  CHECKED_IN: idCard,
  COMPLETED: approved,
  CANCELLED: cancelled,
  NO_SHOW: noShow,
};

export const specialtyIcon: Record<Specialty, string> = {
  GENERAL_PRACTICE: medicine,
  PEDIATRICS: healthy,
  DERMATOLOGY: skin,
  CARDIOLOGY: unhealthy, // the heartbeat-trace heart
  ORTHOPEDICS: skeleton,
};

/** Best-effort icon for a service by name; falls back to the pill bottle. */
export function serviceIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('physical')) return physicalCheck;
  if (n.includes('follow')) return onlineConsultation;
  if (n.includes('skin')) return skin;
  if (n.includes('ecg') || n.includes('cardio')) return unhealthy;
  if (n.includes('checkup') || n.includes('consult')) return checkUp;
  return medicine;
}

/**
 * Avatar for a seeded doctor. Gender isn't in the data model, so this keys off
 * the seed's known female first names — purely cosmetic, demo-data only.
 */
const FEMALE_DOCTOR_NAMES = ['sara', 'reem', 'noura'];
export function doctorAvatar(name: string): string {
  const first = name.replace(/^dr\.?\s+/i, '').split(/\s+/)[0]?.toLowerCase() ?? '';
  return FEMALE_DOCTOR_NAMES.includes(first) ? femaleDoctor : maleDoctor;
}

// ---- Patient avatar choice (picked at signup, kept in localStorage). ----

export type AvatarChoice = 'male' | 'female';

const avatarKey = (email: string) => `medibook:avatar:${email.toLowerCase()}`;

export function saveAvatarChoice(email: string, choice: AvatarChoice): void {
  localStorage.setItem(avatarKey(email), choice);
}

export function userAvatar(email: string, role: string): string {
  if (role === 'STAFF') return customerServiceAgent;
  if (role === 'DOCTOR') return doctorAvatar('');
  const stored = localStorage.getItem(avatarKey(email));
  if (stored === 'female') return femaleUser;
  if (stored === 'male') return maleUser;
  // No stored pick (e.g. seeded accounts): stable pseudo-random fallback.
  let h = 0;
  for (const c of email) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h % 2 === 0 ? maleUser : femaleUser;
}
