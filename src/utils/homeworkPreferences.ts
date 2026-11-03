export function normalizeHideCompletedHomework(value?: {
  hide_completed_in_overview?: unknown;
  completed_display?: unknown;
}): boolean {
  return typeof value?.hide_completed_in_overview === 'boolean'
    ? value.hide_completed_in_overview
    : value?.completed_display === 'hidden';
}
