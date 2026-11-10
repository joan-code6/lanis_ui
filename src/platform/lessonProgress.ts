import type { DeviceStatus } from './native';

type ProgressBridge = {
  getStatus(): Promise<DeviceStatus>;
  setLessonProgress(options: { enabled: boolean; breaks: boolean }): Promise<DeviceStatus>;
};

// Persist intent even if OS permissions are denied; permission recovery is a separate action.
export async function toggleLessonProgress(bridge: ProgressBridge): Promise<DeviceStatus> {
  const current = await bridge.getStatus();
  return bridge.setLessonProgress({ enabled: !current.glyphLessonsEnabled, breaks: current.glyphBreaksEnabled });
}
