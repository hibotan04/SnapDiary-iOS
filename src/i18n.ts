// Lightweight i18n for the calendar diary app.
// Japanese is the default; users can switch to English from the settings menu.

import { NativeModules, Platform } from 'react-native';

export type Language = 'ja' | 'en';

export interface Strings {
  // SideMenu
  layout: string;
  layoutStandard: string;
  layoutSequential: string;
  layoutWeekly: string;
  showText: string;
  photoOnly: string;
  lightMode: string;
  darkMode: string;
  languageLabel: string;
  languageValue: string;

  // CalendarGrid
  weekdays: string[];
  weekLabel: (n: number) => string;

  // EntryModal
  selectPhoto: string;
  library: string;
  loadingPhotos: string;
  noPhotos: string;
  openLibrary: string;
  change: string;
  tapToAddPhoto: string;
  save: string;
  diaryPlaceholder: string;

  // ImageCropper
  adjustPhoto: string;
  cropHint: string;
  saveCropFailed: string;

  // Alerts (useDiaryData)
  error: string;
  noDateSelected: string;
  permissionRequired: string;
  permissionPhotosFilter: string;
  invalidDateFormat: (date: string) => string;
  couldNotLoadPhotos: (msg: string) => string;
  permissionAllowAccess: string;
}

export const translations: Record<Language, Strings> = {
  ja: {
    layout: 'レイアウト',
    layoutStandard: '標準',
    layoutSequential: '連続 (6×6)',
    layoutWeekly: '週ごと (4×2)',
    showText: 'テキスト表示',
    photoOnly: '写真のみ',
    lightMode: 'ライトモード',
    darkMode: 'ダークモード',
    languageLabel: '言語',
    languageValue: '日本語',

    weekdays: ['日', '月', '火', '水', '木', '金', '土'],
    weekLabel: (n) => `第${n}週`,

    selectPhoto: '写真を選ぶ',
    library: 'ライブラリ',
    loadingPhotos: '写真を読み込み中...',
    noPhotos: 'この日の写真が見つかりません',
    openLibrary: 'ライブラリを開く',
    change: '変更',
    tapToAddPhoto: 'タップして写真を追加',
    save: '保存する',
    diaryPlaceholder: '今日はどんな1日でしたか？',

    adjustPhoto: '写真を調整',
    cropHint: 'ピンチで拡大 • ドラッグで移動 • 回転',
    saveCropFailed: '写真の保存に失敗しました',

    error: 'エラー',
    noDateSelected: '日付が選択されていません',
    permissionRequired: 'アクセス許可が必要です',
    permissionPhotosFilter: '日付で絞り込むには写真へのアクセスを許可してください。',
    invalidDateFormat: (date) => `日付の形式が正しくありません: ${date}`,
    couldNotLoadPhotos: (msg) => `写真を読み込めませんでした: ${msg}`,
    permissionAllowAccess: '写真へのアクセスを許可してください。',
  },
  en: {
    layout: 'Layout',
    layoutStandard: 'Standard',
    layoutSequential: 'Sequential (6x6)',
    layoutWeekly: 'Weekly (4x2)',
    showText: 'Show Text',
    photoOnly: 'Photo Only',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    languageLabel: 'Language',
    languageValue: 'English',

    weekdays: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    weekLabel: (n) => `Week ${n}`,

    selectPhoto: 'Select Photo',
    library: 'Library',
    loadingPhotos: 'Loading photos...',
    noPhotos: 'No photos found for this date.',
    openLibrary: 'OPEN FULL LIBRARY',
    change: 'Change',
    tapToAddPhoto: 'Tap to add photo',
    save: 'SAVE ENTRY',
    diaryPlaceholder: 'How was your day?',

    adjustPhoto: 'Adjust Photo',
    cropHint: 'Pinch to Zoom • Drag to Move • Rotate',
    saveCropFailed: 'Failed to save crop',

    error: 'Error',
    noDateSelected: 'No date selected',
    permissionRequired: 'Permission Required',
    permissionPhotosFilter: 'Please allow access to photos to filter by date.',
    invalidDateFormat: (date) => `Invalid date format: ${date}`,
    couldNotLoadPhotos: (msg) => `Could not load photos: ${msg}`,
    permissionAllowAccess: 'Please allow access.',
  },
};

// Detects the device's preferred language so first-time users in non-Japanese
// regions get English automatically. Dependency-free: reads React Native's
// native locale settings, with an Intl fallback. A user's saved choice always
// overrides this (applied on load in App.tsx).
export const getDeviceLanguage = (): Language => {
  const pick = (raw?: string | null): Language | null => {
    if (!raw) return null;
    return raw.toLowerCase().startsWith('ja') ? 'ja' : 'en';
  };
  try {
    const sm: any = NativeModules.SettingsManager?.settings;
    const iosLocale = sm?.AppleLocale || (Array.isArray(sm?.AppleLanguages) ? sm.AppleLanguages[0] : undefined);
    const androidLocale = (NativeModules.I18nManager as any)?.localeIdentifier;
    const fromNative = pick(Platform.OS === 'ios' ? iosLocale : androidLocale);
    if (fromNative) return fromNative;

    const fromIntl = pick(Intl.DateTimeFormat().resolvedOptions().locale);
    if (fromIntl) return fromIntl;
  } catch {
    // fall through to default
  }
  return 'ja';
};

// Module-level language, used by imperative code (e.g. Alerts in hooks)
// that isn't part of the React prop tree. Kept in sync from App.tsx.
let activeLanguage: Language = 'ja';

export const setI18nLanguage = (lang: Language) => {
  activeLanguage = lang;
};

export const t = (): Strings => translations[activeLanguage];
