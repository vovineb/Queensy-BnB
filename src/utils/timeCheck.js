import { differenceInHours, parseISO, isBefore } from 'date-fns';

export const isCheckInExpired = (checkInDate) => {
  const now = new Date();
  const checkIn = new Date(checkInDate);
  return isBefore(checkIn, now) && differenceInHours(now, checkIn) >= 12;
};
