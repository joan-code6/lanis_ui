export interface TimetableRefreshTracker {
  shouldRefresh: (reloadKey: number) => boolean;
  markSuccessful: (reloadKey: number) => void;
}

/**
 * Keeps an explicit refresh request pending until the matching request succeeds.
 * This matters when a request is aborted because another timetable dependency changed.
 */
export const createTimetableRefreshTracker = (initialReloadKey = 0): TimetableRefreshTracker => {
  let lastSuccessfulReloadKey = initialReloadKey;

  return {
    shouldRefresh: reloadKey => reloadKey !== lastSuccessfulReloadKey,
    markSuccessful: reloadKey => {
      lastSuccessfulReloadKey = Math.max(lastSuccessfulReloadKey, reloadKey);
    },
  };
};
