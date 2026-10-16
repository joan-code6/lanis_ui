/** Only connectivity/server failures can use cached personal data. Auth failures cannot. */
export function canUseOfflineTimetable(status: number | undefined, options: { plan_mode: string; week_type?: string }, aborted: boolean): boolean {
  return !aborted && options.plan_mode === 'personal' && !options.week_type && (status === undefined || status >= 500);
}
