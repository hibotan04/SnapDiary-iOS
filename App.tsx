import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, Alert, Keyboard } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as FileSystem from 'expo-file-system/legacy';
import * as StoreReview from 'expo-store-review';

import { ThemeColor, GridMode } from './src/types';
import { THEMES } from './src/theme';
import { Language, setI18nLanguage, getDeviceLanguage } from './src/i18n';
import { useDiaryData } from './src/hooks/useDiaryData';
// Removed AuthContext import
import { CalendarHeader } from './src/components/CalendarHeader';
import { CalendarGrid } from './src/components/CalendarGrid';
import { EntryModal } from './src/components/EntryModal';
import { SideMenu } from './src/components/SideMenu';
import { ImageCropper } from './src/components/ImageCropper';

const SETTINGS_FILE_URI = FileSystem.documentDirectory + 'app_settings.json';

export default function App() {
  const [fontsLoaded] = useFonts({
    'NicoMoji': require('./assets/fonts/NicoMoji-Regular.ttf'),
    'RoundedMplus1c': require('./assets/fonts/RoundedMplus1c-Regular.ttf'),
  });

  const [currentDate, setCurrentDate] = useState(new Date());

  // Custom Hook for Data
  const {
    entries,
    addEntry,
    isPhotoPickerOpen,
    setIsPhotoPickerOpen,
    pickerPhotos,
    pickerLoading,
    croppingImage,
    setCroppingImage,
    launchDatePhotoPicker,
    handleSelectPhoto,
    launchStandardPicker
  } = useDiaryData();

  // Local UI State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempText, setTempText] = useState("");
  const [tempImage, setTempImage] = useState<string | null>(null);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isPhotoOnly, setIsPhotoOnly] = useState(false);
  const [gridMode, setGridMode] = useState<GridMode>('standard');
  const [themeColor, setThemeColor] = useState<ThemeColor>('mono');
  // Default to the device language for first-time users; a saved choice (loaded
  // below) overrides this. Lazy initializer so detection runs only once.
  const [language, setLanguage] = useState<Language>(() => getDeviceLanguage());

  // Whether we've already shown the in-app App Store review prompt (ask once only)
  const [reviewRequested, setReviewRequested] = useState(false);

  // Keep imperative i18n (e.g. Alerts in hooks) in sync with the selected language
  useEffect(() => {
    setI18nLanguage(language);
  }, [language]);

  // Derived
  const currentTheme = THEMES[themeColor] || THEMES['mono'];
  const colors = currentTheme[isDarkMode ? 'dark' : 'light'];

  // Tracks whether the initial settings load has finished. Until it has, we must
  // NOT run the save effect, otherwise the mount-time save would overwrite the
  // persisted file with default values before the load can apply them.
  const settingsLoaded = useRef(false);

  // Load Settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsInfo = await FileSystem.getInfoAsync(SETTINGS_FILE_URI);
        if (settingsInfo.exists) {
          const settingsContent = await FileSystem.readAsStringAsync(SETTINGS_FILE_URI);
          const settings = JSON.parse(settingsContent);
          if (settings.isDarkMode !== undefined) setIsDarkMode(settings.isDarkMode);
          if (settings.isPhotoOnly !== undefined) setIsPhotoOnly(settings.isPhotoOnly);
          if (settings.gridMode !== undefined) setGridMode(settings.gridMode);
          if (settings.themeColor !== undefined && THEMES[settings.themeColor as ThemeColor]) setThemeColor(settings.themeColor);
          if (settings.language === 'ja' || settings.language === 'en') setLanguage(settings.language);
          if (settings.reviewRequested === true) setReviewRequested(true);
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      } finally {
        settingsLoaded.current = true;
      }
    };
    loadSettings();
  }, []);

  // Save Settings (only after the initial load, to avoid clobbering stored values)
  useEffect(() => {
    if (!settingsLoaded.current) return;
    const saveSettings = async () => {
      const settings = { isDarkMode, isPhotoOnly, gridMode, themeColor, language, reviewRequested };
      try {
        await FileSystem.writeAsStringAsync(SETTINGS_FILE_URI, JSON.stringify(settings));
      } catch (e) {
        console.error("Failed to save settings", e);
      }
    };
    saveSettings();
  }, [isDarkMode, isPhotoOnly, gridMode, themeColor, language, reviewRequested]);


  if (!fontsLoaded) return null;

  // Calendar Logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDayPress = (day: number) => {
    const dateKey = `${year}-${month + 1}-${day}`;
    setSelectedDate(dateKey);
    const existingEntry = entries[dateKey];
    setTempText(existingEntry?.text || "");
    setTempImage(existingEntry?.image || null);
    setIsModalOpen(true);
  };

  const handleSaveEntry = () => {
    if (selectedDate) {
      addEntry(selectedDate, { text: tempText, image: tempImage || '' });
    }
    setIsModalOpen(false);
    maybeAskForReview();
  };

  // After the user has recorded a few days (a positive moment), ask once for an
  // App Store review. iOS itself rate-limits how often the prompt actually shows.
  const maybeAskForReview = async () => {
    if (reviewRequested) return;
    const isNewDay = !!selectedDate && !entries[selectedDate];
    const distinctDays = Object.keys(entries).length + (isNewDay ? 1 : 0);
    if (distinctDays < 3) return;
    try {
      if ((await StoreReview.isAvailableAsync()) && (await StoreReview.hasAction())) {
        await StoreReview.requestReview();
        setReviewRequested(true);
      }
    } catch (e) {
      console.error('Review request failed', e);
    }
  };

  const handleCropComplete = (uri: string) => {
    setTempImage(uri);
    setCroppingImage(null);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDarkMode ? "light" : "dark"} backgroundColor={colors.bg} />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>

          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <CalendarHeader currentDate={currentDate} colors={colors} lang={language} />

            <View style={{ flex: 1 }}>
              <CalendarGrid
                currentDate={currentDate}
                entries={entries}
                colors={colors}
                gridMode={gridMode}
                isPhotoOnly={isPhotoOnly}
                onDayPress={handleDayPress}
                onSwipeLeft={nextMonth}
                onSwipeRight={prevMonth}
                lang={language}
              />
            </View>
          </View>

          <SideMenu
            isOpen={isSettingsOpen}
            onToggle={() => setIsSettingsOpen(!isSettingsOpen)}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            isPhotoOnly={isPhotoOnly}
            onTogglePhotoOnly={() => setIsPhotoOnly(!isPhotoOnly)}
            gridMode={gridMode}
            onGridModeChange={setGridMode}
            themeColor={themeColor}
            onThemeChange={setThemeColor}
            language={language}
            onToggleLanguage={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
            colors={colors}
          />

          <EntryModal
            isVisible={isModalOpen && !croppingImage}
            onClose={() => setIsModalOpen(false)}
            selectedDate={selectedDate}
            text={tempText}
            setText={setTempText}
            image={tempImage}
            onPickImage={() => launchDatePhotoPicker(selectedDate || "")}
            onDeleteImage={() => setTempImage(null)}
            onSave={handleSaveEntry}
            colors={colors}
            isDarkMode={isDarkMode}
            lang={language}

            isPhotoPickerOpen={isPhotoPickerOpen}
            onClosePhotoPicker={() => setIsPhotoPickerOpen(false)}
            pickerLoading={pickerLoading}
            pickerPhotos={pickerPhotos}
            onSelectPhoto={handleSelectPhoto}
            onLaunchStandardPicker={async () => {
              const uri = await launchStandardPicker();
              if (uri) setTempImage(uri);
            }}
          />

          {/* Global Cropper Modal */}
          <Modal
            visible={!!croppingImage}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setCroppingImage(null)}
          >
            {croppingImage && (
              <ImageCropper
                imageUri={croppingImage}
                onCancel={() => setCroppingImage(null)}
                onComplete={handleCropComplete}
                lang={language}
              />
            )}
          </Modal>

        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
