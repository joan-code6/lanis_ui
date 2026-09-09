import type { DSBPlanTable, TimetableDay, TimetableLesson, TimetableResponse, VertretungsplanResponse } from '../types';
import { examPeriods, lessonPeriods, atPeriods } from './timetableExams';

export interface Substitution {
  source: 'DSB' | 'Schulportal';
  date: string;
  periods: number[];
  classes: string;
  subject: string;
  oldSubject: string;
  teacher: string;
  oldTeacher: string;
  room: string;
  kind: string;
  info: string;
  group: string;
  cancelled: boolean;
}
const clean = (value: unknown): string => String(value ?? '').trim();
const norm = (value: string): string => value.normalize('NFKC').toLocaleLowerCase('de').replace(/\s+/g, ' ').trim();
const change = (value: unknown): [string, string] => {
  const parts = clean(value).split(/\s*(?:→|->)\s*/);
  return [parts[0], parts[parts.length - 1]];
};
const meaningful = (value: string) => !/^(?:[-–—]+|\?)?$/.test(value);
export const classTokens = (value: string): string[] => norm(value).split(/[,;/\s]+/).filter(Boolean).map(part => part.replace(/^0+(?=\d)/, ''));
const sameClass = (a: string, b: string) => classTokens(a).some(value => classTokens(b).includes(value));
const subjectKey = (value: string): string => {
  const text = norm(value);
  const aliases: Record<string, string> = { d: 'deutsch', m: 'mathematik', mathe: 'mathematik', e: 'englisch', f: 'französisch', l: 'latein', bio: 'biologie', b: 'biologie', ch: 'chemie', ph: 'physik', ku: 'kunst', mu: 'musik', spo: 'sport', sp: 'sport', g: 'geschichte', pw: 'politik und wirtschaft', powi: 'politik und wirtschaft', ek: 'erdkunde' };
  const base = text.replace(/\s+(?:[12]\.?\s*(?:fs|fremdsprache)|grundkurs|leistungskurs|gk|lk).*$/, '');
  return aliases[base] || base;
};
const teacherKey = (value: string) => norm(value).replace(/^(?:hr\.?|fr\.?|herr|frau)\s+/, '');
const make = (input: Omit<Substitution, 'cancelled'>): Substitution => ({
  ...input,
  cancelled: /\b(?:entfall|ausfall|entfällt|fällt aus)\b/i.test(input.kind),
});

export function dsbSubstitutions(tables: DSBPlanTable[]): Substitution[] {
  return tables.flatMap(table => {
    if (!table.date || !/^\d{4}-\d{2}-\d{2}$/.test(table.date)) return [];
    return table.rows.flatMap(row => {
      const cells = new Map(table.headers.map((header, index) => [norm(header), clean(Array.isArray(row) ? row[index] : row[header])]));
      const get = (...names: string[]) => names.map(name => cells.get(name)).find(Boolean) || '';
      const periods = examPeriods(get('stunde', 'stunden', 'std.'));
      const classes = get('klasse(n)', 'klasse', 'klassen');
      if (!classes) return [];
      const [oldSubject, subject] = change(get('fach'));
      const [oldTeacher, teacher] = change(get('vertreter', 'lehrer'));
      return [make({ source: 'DSB', date: table.date!, periods, classes, oldSubject, subject, oldTeacher, teacher,
        room: change(get('raum'))[1], kind: get('art'), info: get('bemerkungen / hinweise', 'hinweis', 'text', 'bemerkung'), group: get('lerngruppe', 'kurs') })];
    });
  });
}

export function nativeSubstitutions(plan: VertretungsplanResponse): Substitution[] {
  return plan.days.flatMap(day => day.substitutions.map(entry => make({
    source: 'Schulportal', date: clean(entry.tag_en || day.date), periods: examPeriods(clean(entry.stunde)),
    classes: clean(entry.klasse_alt || entry.klasse), subject: clean(entry.fach), oldSubject: clean(entry.fach_alt || entry.fach),
    teacher: clean(entry.vertreterkuerzel || entry.vertreter), oldTeacher: clean(entry.lehrerkuerzel || entry.lehrer),
    room: clean(entry.raum), kind: clean(entry.art), info: [entry.hinweis, entry.hinweis2].filter(Boolean).join(' · '), group: clean(entry.lerngruppe),
  })));
}

export type SubstitutionDay = TimetableDay & { substitutionNotices: Substitution[] };
export function applySubstitutions(days: TimetableDay[], changes: Substitution[], ownClass: string, slots: NonNullable<TimetableResponse['time_slots']> = []): SubstitutionDay[] {
  // Deduplicate repeated print pages; retain differing reports as visible conflicts.
  const unique = [...new Map(changes.map(item => [JSON.stringify({ ...item, source: undefined }), item])).values()];
  return days.map(day => {
    const relevant = unique.filter(item => item.date === day.date && (sameClass(item.classes, ownClass) || day.lessons.some(lesson => sameClass(item.classes, lesson.class_name || ''))));
    const assigned = new Map<number, Map<number, Substitution[]>>();
    const notices = new Set<Substitution>();
    for (const item of relevant) {
      const candidates = day.lessons.map((lesson, index) => ({ lesson, index })).filter(({ lesson }) =>
        sameClass(item.classes, lesson.class_name || ownClass) && lessonPeriods(lesson).some(period => item.periods.includes(period)));
      const scored = candidates.map(candidate => {
        const { lesson } = candidate;
        const subject = meaningful(item.oldSubject) && subjectKey(item.oldSubject) === subjectKey(lesson.subject);
        const teacher = meaningful(item.oldTeacher) && teacherKey(item.oldTeacher) === teacherKey(lesson.teacher || '');
        const group = Boolean(item.group) && norm(item.group) === norm(lesson.course_name || '');
        return { ...candidate, score: Number(subject) * 2 + Number(teacher) * 3 + Number(group) * 5 };
      }).sort((a, b) => b.score - a.score);
      // Upper-school year groups contain parallel courses. Class + period alone
      // is only safe for a single concrete class and an explicit special lesson.
      const special = /sondereins|klassen(?:leitungs)?stunde|zusatz/i.test(`${item.kind} ${item.subject}`);
      const concreteClass = classTokens(item.classes).every(value => /^\d+[a-z]$/.test(value));
      for (const period of item.periods) {
        const options = scored.filter(candidate => lessonPeriods(candidate.lesson).includes(period));
        const best = options[0];
        // A year group can have several courses in the same subject; require a
        // teacher or course identifier before changing one of those lessons.
        const identified = best && (concreteClass ? best.score > 0 || special : best.score >= 3);
        const selected = identified && (options.length === 1 || best.score > options[1].score) ? best : undefined;
        if (!selected) { notices.add(item); continue; }
        const previous = assigned.get(selected.index) || new Map<number, Substitution[]>();
        previous.set(period, [...(previous.get(period) || []), item]);
        assigned.set(selected.index, previous);
      }
      if (!item.periods.length) notices.add(item);
    }
    const lessons = day.lessons.flatMap((lesson, index) => {
      const matches = assigned.get(index);
      if (!matches?.size) return [lesson];
      const runs: { periods: number[]; item?: Substitution }[] = [];
      for (const period of lessonPeriods(lesson)) {
        const applicable = matches.get(period) || [];
        if (applicable.length > 1) applicable.forEach(item => notices.add(item));
        const item = applicable.length === 1 ? applicable[0] : undefined;
        const last = runs[runs.length - 1];
        if (last && last.item === item && last.periods[last.periods.length - 1] + 1 === period) last.periods.push(period);
        else runs.push({ periods: [period], item });
      }
      return runs.map(({ periods, item }) => {
        const split = atPeriods(lesson, periods, slots);
        split.id = `${lesson.id || index}-${day.date}-${periods[0]}`;
        if (!item) return split;
        return { ...split,
          subject: !item.cancelled && meaningful(item.subject) ? item.subject : lesson.subject,
          teacher: !item.cancelled && meaningful(item.teacher) ? item.teacher : lesson.teacher,
          room: !item.cancelled && meaningful(item.room) ? item.room : lesson.room,
          cancelled: item.cancelled,
          substitution: item,
          original_lesson: { subject: lesson.subject, teacher: lesson.teacher, room: lesson.room },
          info: [lesson.info, item.info].filter(Boolean).join(' · '),
        };
      });
    });
    return { ...day, lessons, substitutionNotices: [...notices] };
  });
}
