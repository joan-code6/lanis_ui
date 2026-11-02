import { Capacitor, registerPlugin } from '@capacitor/core';
import type { TimetableResponse } from '../types';

export const isAndroid = Capacitor.getPlatform() === 'android';
// Preview only changes presentation; it never enables native APIs in a browser.
export const androidPresentation = isAndroid || (import.meta.env.DEV && new URLSearchParams(location.search).has('android-preview'));

export interface DeviceStatus {
  signedIn: boolean;
  appLockEnabled: boolean;
  appLockAvailable: boolean;
  lastUpdated: number;
  syncError: string;
  notificationsAllowed: boolean;
  notificationsEnabled: boolean;
  pushConfigured: boolean;
  widgetPinSupported: boolean;
  version: string;
}
export type WidgetKind = 'next' | 'today' | 'changes';
export interface NativeSession { [key: string]: string }

interface LanisNativePlugin {
  setAppLock(options: { enabled: boolean }): Promise<DeviceStatus>;
  openFile(options: { uri: string; mimeType: string }): Promise<void>;
  getSession(): Promise<{ values: NativeSession; backend?: string }>;
  saveSession(options: { values: NativeSession; backend: string }): Promise<void>;
  clearSession(): Promise<void>;
  getStatus(): Promise<DeviceStatus>;
  sync(): Promise<DeviceStatus>;
  setAppearance(options: { dark: boolean; oled: boolean; accent: string; theme: string }): Promise<void>;
  pinWidget(options: { kind: WidgetKind }): Promise<{ requested: boolean }>;
  saveTimetable(options: { data: TimetableResponse; owner: string }): Promise<void>;
  getTimetable(): Promise<{ data?: TimetableResponse; updatedAt: number }>;
  setNotifications(options: { enabled: boolean }): Promise<DeviceStatus>;
  openNotificationSettings(): Promise<void>;
}
export const LanisNative = registerPlugin<LanisNativePlugin>('LanisNative');
