export const ACCOUNT_DATA_GENERATION_KEY = '__lanis_account_data_generation';

let deletionInProgress = false;
const DELETION_LEASE_MS = 15 * 60 * 1000;
let deletionLeaseTimer: number | undefined;

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
      // localStorage.clear() is part of deletion cleanup; keep blocking writes
      // in this tab until a fresh login announces that deletion is complete.
      deletionInProgress = true;
    }
  });
}

export const captureAccountDataGeneration = (): number => readGenerationState().generation;

export const isAccountDataDeletionInProgress = (): boolean => readGenerationState().deleting;

export const ownsAccountDataDeletion = (generation: number): boolean => {
  const state = readGenerationState();
  return state.deleting && state.generation === generation;
};

export const canWriteAccountData = (generation: number): boolean => {
  const state = readGenerationState();
  if (!state.deleting) deletionInProgress = false;
  return !deletionInProgress && !state.deleting && state.generation === generation;
};

export const beginAccountDataDeletion = (): number => {
  const generation = captureAccountDataGeneration() + 1;
  deletionInProgress = true;
  writeDeletionLease(generation);
  if (deletionLeaseTimer !== undefined) window.clearInterval(deletionLeaseTimer);
  deletionLeaseTimer = window.setInterval(() => {
    if (deletionInProgress) writeDeletionLease(generation);
  }, Math.floor(DELETION_LEASE_MS / 3));
  return generation;
};

export const restoreAccountDataDeletionState = (generation: number): void => {
  deletionInProgress = true;
  writeDeletionLease(generation);
  if (deletionLeaseTimer !== undefined) window.clearInterval(deletionLeaseTimer);
  deletionLeaseTimer = window.setInterval(() => {
    if (deletionInProgress) writeDeletionLease(generation);
  }, Math.floor(DELETION_LEASE_MS / 3));
};

export const finishAccountDataDeletion = (generation: number): void => {
  if (readGenerationState().generation !== generation) return;
  if (deletionLeaseTimer !== undefined) window.clearInterval(deletionLeaseTimer);
  deletionLeaseTimer = undefined;
  const nextGeneration = generation + 1;
  deletionInProgress = false;
  try {
    window.localStorage.setItem(
      ACCOUNT_DATA_GENERATION_KEY,
      `${nextGeneration}:active`,
    );
  } catch {
    // Keep the in-memory state aligned when local storage is unavailable.
  }
};

export const completeAccountDataDeletion = (): void => {
  if (deletionLeaseTimer !== undefined) window.clearInterval(deletionLeaseTimer);
  deletionLeaseTimer = undefined;
  const generation = captureAccountDataGeneration() + 1;
  deletionInProgress = false;
  try {
    window.localStorage.setItem(
      ACCOUNT_DATA_GENERATION_KEY,
      `${generation}:active`,
    );
  } catch {
    // A successful login should not fail because this cache guard is unavailable.
  }
};
