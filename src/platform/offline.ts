/** Only connectivity/server failures can use cached personal data. Auth failures cannot. */
export function canUseOfflineTimetable(status: number | undefined, options: { plan_mode: string; week_type?: string; show_substitutions?: boolean }, aborted: boolean): boolean {
  return !aborted && options.plan_mode === 'personal' && options.show_substitutions !== false && !options.week_type && (status === undefined || status >= 500);
}
