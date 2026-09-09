import { isDemoRoute } from '../utils/demoMode';
import { appsAPI, dsbAPI, vertretungsplanAPI } from './api';
import { getModuleAvailability } from '../utils/moduleCache';
import { dsbSubstitutions, nativeSubstitutions, Substitution } from '../utils/timetableSubstitutions';

// Existing DSB school configuration, shared with the dedicated DSB view.
export const dsbSchoolCredentials = { username: '282822', password: 'berlin' };
export async function loadTimetableSubstitutions(token: string, schoolId: string, signal: AbortSignal, refresh = false) {
  const modules = await appsAPI.getModules(token, signal);
  if (!modules.success) throw new Error('Module konnten nicht geladen werden.');
  const available = getModuleAvailability(modules.modules);
  const sources: { name: string; fetch: () => Promise<{ changes: Substitution[]; updated?: string | null }> }[] = [];
  if (available.hasNativeSubstitutionPlan) sources.push({ name: 'Schulportal', fetch: async () => {
    const plan = await vertretungsplanAPI.getPlan(token, refresh, signal);
    if (!plan.success || plan.available === false) throw new Error('Vertretungsplan nicht verfügbar');
    return { changes: nativeSubstitutions(plan), updated: plan.last_updated };
  } });
  if (available.hasDsbModule) sources.push({ name: 'DSB', fetch: async () => {
    // Never apply this school's DSB plan to another school's timetable.
    if (schoolId !== '5201' && !isDemoRoute()) throw new Error('DSB ist für diese Schule noch nicht eingerichtet.');
    const plan = await dsbAPI.getPlan(token, dsbSchoolCredentials, { include_raw: false }, signal);
    if (!plan.success) throw new Error('DSB nicht verfügbar');
    return { changes: dsbSubstitutions(plan.tables), updated: plan.last_updated };
  } });
  const results = await Promise.allSettled(sources.map(source => source.fetch()));
  return {
    changes: results.flatMap(result => result.status === 'fulfilled' ? result.value.changes : []),
    sources: sources.map((source, index) => {
      const result = results[index];
      return { name: source.name, error: result.status === 'rejected', updated: result.status === 'fulfilled' ? result.value.updated : undefined };
    }),
  };
}
