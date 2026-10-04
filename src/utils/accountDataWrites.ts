export const ACCOUNT_DATA_GENERATION_KEY = '__lanis_account_data_generation';
export const ACCOUNT_DATA_DELETION_EPOCH_KEY = '__lanis_account_deletion_epoch';
export const ACCOUNT_DATA_LIFECYCLE_LOCK_KEY = '__lanis_account_data_lifecycle_lock';

let deletionInProgress = false;
const DELETION_LEASE_MS = 15 * 60 * 1000;
let deletionLeaseTimer: number | undefined;

const delay = (milliseconds: number): Promise<void> => new Promise(resolve => {
  window.setTimeout(resolve, milliseconds);
});

const withStorageLifecycleLock = async <T>(operation: () => Promise<T>): Promise<T> => {
  const owner = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const leaseMs = 30_000;

  while (true) {
    let current: { owner?: string; expiresAt?: number } = {};
    try {
      const stored = window.localStorage.getItem(ACCOUNT_DATA_LIFECYCLE_LOCK_KEY) || '{}';
      current = JSON.parse(stored);
    } catch {
      try {
        window.localStorage.getItem(ACCOUNT_DATA_LIFECYCLE_LOCK_KEY);
      } catch {
        throw new Error('Cannot coordinate account changes without browser storage.');
      }
      current = {};
    }
    if (!current.owner || !current.expiresAt || current.expiresAt <= Date.now()) {
      try {
        window.localStorage.setItem(
          ACCOUNT_DATA_LIFECYCLE_LOCK_KEY,
          JSON.stringify({ owner, expiresAt: Date.now() + leaseMs }),
        );
        await delay(20 + Math.floor(Math.random() * 30));
        const claimed = JSON.parse(
          window.localStorage.getItem(ACCOUNT_DATA_LIFECYCLE_LOCK_KEY) || '{}',
        ) as { owner?: string };
        if (claimed.owner === owner) break;
      } catch {
        throw new Error('Cannot coordinate account changes without browser storage.');
      }
    }
    await delay(40 + Math.floor(Math.random() * 60));
  }

  const renewTimer = window.setInterval(() => {
    try {
      const current = JSON.parse(
        window.localStorage.getItem(ACCOUNT_DATA_LIFECYCLE_LOCK_KEY) || '{}',
      ) as { owner?: string };
      if (current.owner === owner) {
        window.localStorage.setItem(
          ACCOUNT_DATA_LIFECYCLE_LOCK_KEY,
          JSON.stringify({ owner, expiresAt: Date.now() + leaseMs }),
        );
      }
    } catch {
      // The lease expires naturally if storage becomes unavailable.
    }
  }, Math.floor(leaseMs / 3));

  try {
    return await operation();
  } finally {
    window.clearInterval(renewTimer);
    try {
      const current = JSON.parse(
        window.localStorage.getItem(ACCOUNT_DATA_LIFECYCLE_LOCK_KEY) || '{}',
      ) as { owner?: string };
      if (current.owner === owner) {
        window.localStorage.removeItem(ACCOUNT_DATA_LIFECYCLE_LOCK_KEY);
      }
    } catch {
      // The lease expires naturally if storage becomes unavailable.
    }
  }
};

export const withAccountDataLifecycleLock = <T>(
  operation: () => Promise<T>,
): Promise<T> => {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request<T>(
      'lanis-account-lifecycle',
      () => operation() as unknown as T,
    );
  }
  return withStorageLifecycleLock(operation);
};

const writeDeletionLease = (generation: number): void => {
  try {
    window.localStorage.setItem(
      ACCOUNT_DATA_GENERATION_KEY,
      `${generation}:deleting:${Date.now() + DELETION_LEASE_MS}`,
    );
  } catch {
    // The module-level guard still protects writes in this tab.
  }
};

const stopDeletionLeaseTimer = (deleting: boolean): void => {
  if (deletionLeaseTimer !== undefined) window.clearInterval(deletionLeaseTimer);
  deletionLeaseTimer = undefined;
  deletionInProgress = deleting;
};

const startDeletionLeaseTimer = (generation: number): void => {
  if (deletionLeaseTimer !== undefined) window.clearInterval(deletionLeaseTimer);
  deletionLeaseTimer = window.setInterval(() => {
    const state = readGenerationState();
    if (state.generation !== generation) {
      stopDeletionLeaseTimer(state.deleting);
      return;
    }
    if (deletionInProgress && hasAccountDataDeletionMarker()) writeDeletionLease(generation);
  }, Math.floor(DELETION_LEASE_MS / 3));
};

const readGenerationState = (): { generation: number; deleting: boolean } => {
  try {
    const value = window.localStorage.getItem(ACCOUNT_DATA_GENERATION_KEY) || '';
    const [generationText, state, expiryText] = value.split(':', 3);
    const generation = Number.parseInt(generationText, 10);
    const leaseExpiry = Number.parseInt(expiryText || '', 10);
    return {
      generation: Number.isFinite(generation) ? generation : 0,
      deleting: state === 'deleting' && Number.isFinite(leaseExpiry) && leaseExpiry > Date.now(),
    };
  } catch {
    return { generation: 0, deleting: deletionInProgress };
  }
};

if (typeof window !== 'undefined') {
    const initialState = readGenerationState();
    deletionInProgress = initialState.deleting;
    window.addEventListener('storage', (event) => {
      if (event.key === ACCOUNT_DATA_GENERATION_KEY) {
      deletionInProgress = readGenerationState().deleting;
    } else if (event.key === null && deletionInProgress) {
      // Keep blocking writes if another storage operation removes the marker.
      deletionInProgress = true;
    }
  });
}

export const captureAccountDataGeneration = (): number => readGenerationState().generation;

export const isAccountDataDeletionInProgress = (): boolean => readGenerationState().deleting;

export const hasAccountDataDeletionMarker = (): boolean => {
  try {
    const marker = window.localStorage.getItem(ACCOUNT_DATA_GENERATION_KEY) || '';
    return marker.split(':', 3)[1] === 'deleting';
  } catch {
    return deletionInProgress;
  }
};

export const ownsAccountDataDeletion = (generation: number): boolean => {
  try {
    const [generationText, state] = (window.localStorage.getItem(ACCOUNT_DATA_GENERATION_KEY) || '').split(':', 3);
    return state === 'deleting' && Number.parseInt(generationText, 10) === generation;
  } catch {
    return deletionInProgress && readGenerationState().generation === generation;
  }
};

export const hasAccountDataLoginSince = (generation: number): boolean => {
  try {
    const value = window.localStorage.getItem(ACCOUNT_DATA_GENERATION_KEY) || '';
    const [generationText, state] = value.split(':', 3);
    const currentGeneration = Number.parseInt(generationText, 10);
    return state === 'login' && Number.isFinite(currentGeneration) && currentGeneration >= generation;
  } catch {
    return false;
  }
};

export const readAccountDataDeletionEpoch = (): number => {
  try {
    const epoch = Number.parseInt(
      window.localStorage.getItem(ACCOUNT_DATA_DELETION_EPOCH_KEY) || '0',
      10,
    );
    return Number.isFinite(epoch) ? epoch : 0;
  } catch {
    return 0;
  }
};

export const hasAccountDataDeletionOccurredSince = (epoch: number): boolean => (
  readAccountDataDeletionEpoch() > epoch
);

export const recordAccountDataDeletion = (): boolean => {
  try {
    window.localStorage.setItem(
      ACCOUNT_DATA_DELETION_EPOCH_KEY,
      String(readAccountDataDeletionEpoch() + 1),
    );
    return true;
  } catch {
    return false;
  }
};

export const canWriteAccountData = (generation: number): boolean => {
  const state = readGenerationState();
  const markerPresent = hasAccountDataDeletionMarker();
  if (!markerPresent && !state.deleting) deletionInProgress = false;
  return !deletionInProgress && !markerPresent && !state.deleting && state.generation === generation;
};

export const beginAccountDataDeletion = (): number => {
  const generation = captureAccountDataGeneration() + 1;
  deletionInProgress = true;
  writeDeletionLease(generation);
  startDeletionLeaseTimer(generation);
  return generation;
};

export const restoreAccountDataDeletionState = (generation: number): void => {
  deletionInProgress = true;
  writeDeletionLease(generation);
  startDeletionLeaseTimer(generation);
};

export const finishAccountDataDeletion = (generation: number): void => {
  const current = readGenerationState();
  if (current.generation > generation) {
    stopDeletionLeaseTimer(current.deleting);
    return;
  }
  if (current.generation < generation && current.deleting) {
    stopDeletionLeaseTimer(true);
    return;
  }
  try {
    const marker = window.localStorage.getItem(ACCOUNT_DATA_GENERATION_KEY) || '';
    const [generationText, state] = marker.split(':', 3);
    const markedGeneration = Number.parseInt(generationText, 10);
    if (state === 'login' && Number.isFinite(markedGeneration) && markedGeneration >= generation) {
      stopDeletionLeaseTimer(false);
      return;
    }
  } catch {
    // If storage is unavailable, the in-memory deletion guard still applies.
  }
  stopDeletionLeaseTimer(false);
  const nextGeneration = generation + 1;
  try {
    window.localStorage.setItem(
      ACCOUNT_DATA_GENERATION_KEY,
      `${nextGeneration}:active`,
    );
  } catch {
    // Keep the in-memory state aligned when local storage is unavailable.
  }
};

export const completeAccountDataDeletion = (expectedGeneration: number): boolean => {
  const current = readGenerationState();
  if (current.deleting || current.generation !== expectedGeneration) return false;
  if (deletionLeaseTimer !== undefined) window.clearInterval(deletionLeaseTimer);
  deletionLeaseTimer = undefined;
  const generation = captureAccountDataGeneration() + 1;
  deletionInProgress = false;
  try {
    window.localStorage.setItem(
      ACCOUNT_DATA_GENERATION_KEY,
      `${generation}:login`,
    );
    return true;
  } catch {
    // A successful login should not fail because this cache guard is unavailable.
    return false;
  }
};
