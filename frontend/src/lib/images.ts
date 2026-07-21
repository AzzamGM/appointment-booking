import type { AppointmentStatus, Specialty } from '../types';

import accountSettings from '../assets/account_settings.svg';
import addCalendar from '../assets/add-calendar.svg';
import addUser from '../assets/add-user.svg';
import approved from '../assets/approved.svg';
import calendar from '../assets/calendar.svg';
import cancel from '../assets/cancel.svg';
import cancelled from '../assets/cancelled.svg';
import cashNote from '../assets/cash-note.svg';
import caution from '../assets/caution.svg';
import checkUp from '../assets/check_up.svg';
import clock from '../assets/clock.svg';
import confirmed from '../assets/confirmed.svg';
import copy from '../assets/copy.svg';
import creditCard from '../assets/credit-card.svg';
import customerServiceAgent from '../assets/customer-service-agent.svg';
import danger from '../assets/danger.svg';
import deleteIcon from '../assets/delete.svg';
import disableBell from '../assets/disable-bell.svg';
import edit from '../assets/edit.svg';
import email from '../assets/email.svg';
import errorNetwork from '../assets/network_error.svg';
import errorGeneral from '../assets/general_error.svg';
import errorNotFound from '../assets/404_error.svg';
import doctorAppointment from '../assets/doctor-appointment.svg';
import femaleDoctor from '../assets/female_doctor.svg';
import femaleNurse from '../assets/female_nurse.svg';
import femaleUser from '../assets/female_user.svg';
import filter from '../assets/filter.svg';
import healthy from '../assets/healthy.svg';
import hide from '../assets/hide.svg';
import home from '../assets/home.svg';
import hourglass from '../assets/hourglass.svg';
import idCard from '../assets/id-card.svg';
import information from '../assets/information.svg';
import inProgress from '../assets/in_progress.svg';
import injection from '../assets/injection.svg';
import locationPin from '../assets/location-pin.svg';
import login from '../assets/login.svg';
import lungs from '../assets/lungs.svg';
import maleDoctor from '../assets/male_doctor.svg';
import maleNurse from '../assets/male-nurse.svg';
import maleUser from '../assets/male_user.svg';
import mapLocation from '../assets/map-location.svg';
import medicine from '../assets/medicine_png.svg';
import menu from '../assets/menu.svg';
import mobileNotification from '../assets/mobile-notification.svg';
import otp from '../assets/otp.svg';
import moon from '../assets/moon.svg';
import newIcon from '../assets/new.svg';
import noShow from '../assets/no-show.svg';
import notificationBell from '../assets/notification-bell.svg';
import onlineConsultation from '../assets/online-consulation.svg';
import password from '../assets/password.svg';
import paymentMethod from '../assets/payment-method.svg';
import phoneCall from '../assets/phone-call.svg';
import physicalCheck from '../assets/physical_check.svg';
import pills from '../assets/pills.svg';
import questionMark from '../assets/question-mark.svg';
import requested from '../assets/requested.svg';
import save from '../assets/save.svg';
import search from '../assets/search.svg';
import settings from '../assets/settings.svg';
import skeleton from '../assets/skeleton.svg';
import skin from '../assets/skin.svg';
import sun from '../assets/sun.svg';
import thumbDown from '../assets/thumb-down.svg';
import thumbsUp from '../assets/thumbs-up.svg';
import unapproved from '../assets/unapproved.svg';
import unhealthy from '../assets/unhealthy.svg';
import unhide from '../assets/unhide.svg';
import user from '../assets/user.svg';
import userInfo from '../assets/user_info.svg';
import view from '../assets/view.svg';
import virus from '../assets/virus.svg';
import weighingScale from '../assets/weighing-scale.svg';
import xray from '../assets/x-ray.svg';

export const img = {
  accountSettings,
  addCalendar,
  addUser,
  approved,
  calendar,
  cancel,
  cancelled,
  cashNote,
  caution,
  checkUp,
  clock,
  confirmed,
  copy,
  creditCard,
  customerServiceAgent,
  danger,
  delete: deleteIcon,
  disableBell,
  edit,
  email,
  errorNetwork,
  errorGeneral,
  errorNotFound,
  doctorAppointment,
  femaleDoctor,
  femaleNurse,
  femaleUser,
  filter,
  healthy,
  hide,
  home,
  hourglass,
  idCard,
  information,
  inProgress,
  injection,
  locationPin,
  login,
  lungs,
  maleDoctor,
  maleNurse,
  maleUser,
  mapLocation,
  medicine,
  menu,
  mobileNotification,
  moon,
  new: newIcon,
  noShow,
  notificationBell,
  onlineConsultation,
  otp,
  password,
  paymentMethod,
  phoneCall,
  physicalCheck,
  pills,
  questionMark,
  requested,
  save,
  search,
  settings,
  skeleton,
  skin,
  sun,
  thumbDown,
  thumbsUp,
  unapproved,
  unhealthy,
  unhide,
  user,
  userInfo,
  view,
  virus,
  weighingScale,
  xray,
} as const;

export const statusIcon: Record<AppointmentStatus, string> = {
  REQUESTED: requested,
  CONFIRMED: confirmed,
  CHECKED_IN: idCard,
  IN_PROGRESS: inProgress,
  COMPLETED: approved,
  CANCELLED: cancelled,
  NO_SHOW: noShow,
};

export const specialtyIcon: Record<Specialty, string> = {
  GENERAL_PRACTICE: medicine,
  PEDIATRICS: healthy,
  DERMATOLOGY: skin,
  CARDIOLOGY: unhealthy,
  ORTHOPEDICS: skeleton,
};

export function serviceIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('physical')) return physicalCheck;
  if (n.includes('follow')) return onlineConsultation;
  if (n.includes('skin')) return skin;
  if (n.includes('ecg') || n.includes('cardio')) return unhealthy;
  if (n.includes('vaccin') || n.includes('immuni') || n.includes('injection')) return injection;
  if (n.includes('x-ray') || n.includes('xray') || n.includes('imaging') || n.includes('scan'))
    return xray;
  if (n.includes('weight') || n.includes('bmi')) return weighingScale;
  if (n.includes('checkup') || n.includes('consult')) return checkUp;
  return medicine;
}

const FEMALE_DOCTOR_NAMES = ['sara', 'reem', 'noura'];
export function doctorAvatar(name: string): string {
  const first = name.replace(/^dr\.?\s+/i, '').split(/\s+/)[0]?.toLowerCase() ?? '';
  return FEMALE_DOCTOR_NAMES.includes(first) ? femaleDoctor : maleDoctor;
}


export type Gender = 'male' | 'female';

const genderKey = (email: string) => `medibook:avatar:${email.toLowerCase()}`;

export function saveGender(email: string, gender: Gender): void {
  localStorage.setItem(genderKey(email), gender);
}

function emailHash(email: string): number {
  let h = 0;
  for (const c of email) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function userAvatar(email: string, role: string): string {
  if (role === 'STAFF') return customerServiceAgent;
  if (role === 'DOCTOR') return doctorAvatar('');
  if (role !== 'PATIENT') return user;

  const stored = localStorage.getItem(genderKey(email));
  if (stored === 'female') return femaleUser;
  if (stored === 'male') return maleUser;
  return emailHash(email) % 2 === 0 ? maleUser : femaleUser;
}
