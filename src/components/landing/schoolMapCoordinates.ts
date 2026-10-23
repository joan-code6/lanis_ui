import type { HomepageSchoolMapEntry } from '../../types';

// Shared with the consent panel, without importing browser-only Leaflet.
export function hasSchoolCoordinates(
  school: HomepageSchoolMapEntry,
): school is HomepageSchoolMapEntry & { latitude: number; longitude: number } {
  return school.latitude !== null && school.longitude !== null
    && Number.isFinite(school.latitude) && Number.isFinite(school.longitude)
    && school.latitude >= 49.2 && school.latitude <= 51.8
    && school.longitude >= 7.4 && school.longitude <= 10.2;
}
