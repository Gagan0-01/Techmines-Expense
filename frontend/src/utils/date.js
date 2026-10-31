import { format, isValid, parseISO } from 'date-fns';

export const formatDate = (dateValue, formatStr = 'dd MMM yyyy') => {
  if (!dateValue) return '—';
  const d = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);
  if (!isValid(d)) return '—';
  return format(d, formatStr);
};

export const formatDateTime = (dateValue) => {
  if (!dateValue) return '—';
  const d = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);
  if (!isValid(d)) return '—';
  return format(d, 'dd MMM yyyy, hh:mm a');
};

export const formatTime = (dateValue) => {
  if (!dateValue) return '—';
  const d = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);
  if (!isValid(d)) return '—';
  return format(d, 'hh:mm a');
};

export const toInputDateFormat = (dateValue) => {
  if (!dateValue) return '';
  const d = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);
  if (!isValid(d)) return '';
  return format(d, 'yyyy-MM-dd');
};

export const toInputDateTimeFormat = (dateValue) => {
  if (!dateValue) return '';
  const d = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);
  if (!isValid(d)) return '';
  return format(d, "yyyy-MM-dd'T'HH:mm");
};
