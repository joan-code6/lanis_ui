const ACCOUNT_DATA_GENERATION_KEY = '__lanis_account_data_generation';

let deletionInProgress = false;

const readGenerationState = (): { generation: number; deleting: boolean } => {
  try {
    const value = window.localStorage.getItem(ACCOUNT_DATA_GENERATION_KEY) || '';
    const [generationText, state] = value.split(':', 2);
    const generation = Number.parseInt(generationText, 10);
    return {
      generation: Number.isFinite(generation) ? generation : 0,
      deleting: state === 'deleting',
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
      deletionInProgress = event.newValue?.endsWith(':deleting') ?? false;
    } else if (event.key === null && deletionInProgress) {
      // localStorage.clear() is part of deletion cleanup; keep blocking writes
      // in this tab until a fresh login announces that deletion is complete.
      deletionInProgress = true;
    }
  });
}

export const captureAccountDataGeneration = (): number => readGenerationState().generation;

export const canWriteAccountData = (generation: number): boolean => {
  const state = readGenerationState();
  return !deletionInProgress && !state.deleting && state.generation === generation;
};

export const beginAccountDataDeletion = (): number => {
  const generation = captureAccountDataGeneration() + 1;
  deletionInProgress = true;
  try {
    window.localStorage.setItem(
      ACCOUNT_DATA_GENERATION_KEY,
      `${generation}:deleting`,
    );
  } catch {
    // The module-level guard still prevents writes in this tab.
  }
  return generation;
};

export const restoreAccountDataDeletionState = (generation: number): void => {
  deletionInProgress = true;
  try {
    window.localStorage.setItem(
      ACCOUNT_DATA_GENERATION_KEY,
      `${generation}:deleting`,
    );
  } catch {
    // Storage may be disabled; in-memory protection remains active.
  }
};

export const completeAccountDataDeletion = (): void => {
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
