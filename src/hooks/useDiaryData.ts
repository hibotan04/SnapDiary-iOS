import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { DiaryEntry } from '../types';
import { t } from '../i18n';

const DIARY_FILE_URI = FileSystem.documentDirectory + 'diary_entries_v2.json';
const IMAGES_DIR = FileSystem.documentDirectory + 'images/';

// Image paths used to be stored as absolute container paths
// (file:///var/mobile/.../Application/<UUID>/Documents/images/x.jpg). iOS can
// assign a new <UUID> on reinstall/update, which breaks every stored path and
// makes photos disappear. Rebuild each path from its filename against the
// CURRENT documents directory so saved photos survive app updates.
const migrateImagePaths = (
  entries: Record<string, DiaryEntry>
): { entries: Record<string, DiaryEntry>; changed: boolean } => {
  let changed = false;
  const result: Record<string, DiaryEntry> = {};
  for (const key of Object.keys(entries)) {
    const entry = entries[key];
    const img = entry?.image;
    if (img && img.includes('/images/')) {
      const fileName = img.substring(img.lastIndexOf('/') + 1);
      const rebuilt = IMAGES_DIR + fileName;
      if (rebuilt !== img) {
        result[key] = { ...entry, image: rebuilt };
        changed = true;
        continue;
      }
    }
    result[key] = entry;
  }
  return { entries: result, changed };
};

const ensureDirExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
  }
};

export const useDiaryData = () => {
  const [entries, setEntries] = useState<Record<string, DiaryEntry>>({});

  // Photo Picker / Cropper State
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [pickerPhotos, setPickerPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);

  // Load Entries on Mount
  useEffect(() => {
    const loadEntries = async () => {
      try {
        const fileInfo = await FileSystem.getInfoAsync(DIARY_FILE_URI);
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(DIARY_FILE_URI);
          const parsed = JSON.parse(content) as Record<string, DiaryEntry>;
          const migrated = migrateImagePaths(parsed);
          setEntries(migrated.entries);
          // Persist repaired paths so they're correct on next launch too.
          if (migrated.changed) {
            FileSystem.writeAsStringAsync(DIARY_FILE_URI, JSON.stringify(migrated.entries)).catch(() => {});
          }
        } else {
          setEntries({});
        }
      } catch (e) {
        console.error("Failed to load entries", e);
      }
    };
    loadEntries();
  }, []);

  const saveEntries = async (newEntries: Record<string, DiaryEntry>) => {
    setEntries(newEntries);
    try {
      await FileSystem.writeAsStringAsync(DIARY_FILE_URI, JSON.stringify(newEntries));
    } catch (e) {
      console.error("Failed to save entries", e);
    }
  };

  // No Cloud Sync needed for standalone app

  const addEntry = async (dateKey: string, data: DiaryEntry) => {
    let savedImageUri = data.image;

    if (data.image && !data.image.startsWith(IMAGES_DIR)) {
      try {
        await ensureDirExists();
        const fileName = `${dateKey}_${Date.now()}.jpg`;
        const newPath = IMAGES_DIR + fileName;
        await FileSystem.copyAsync({
          from: data.image,
          to: newPath
        });
        savedImageUri = newPath;
      } catch (e) {
        console.error("Failed to save image to permanent storage", e);
      }
    }

    const newEntries = { ...entries, [dateKey]: { ...data, image: savedImageUri } };
    saveEntries(newEntries);
  };

  // === CUSTOM PHOTO PICKER LOGIC ===
  const launchDatePhotoPicker = async (selectedDate: string) => {
    if (!selectedDate) {
      Alert.alert(t().error, t().noDateSelected);
      return;
    }

    try {
      // 1. Request MediaLibrary Permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t().permissionRequired, t().permissionPhotosFilter);
        return;
      }

      // 2. Calculate Date Range
      const parts = selectedDate.split('-');
      const y = parseInt(parts[0].trim(), 10);
      const m = parseInt(parts[1].trim(), 10) - 1;
      const d = parseInt(parts[2].trim(), 10);

      if (isNaN(y) || isNaN(m) || isNaN(d)) {
        Alert.alert(t().error, t().invalidDateFormat(selectedDate));
        return;
      }

      const startOfDay = new Date(y, m, d, 0, 0, 0).getTime();
      const endOfDay = new Date(y, m, d, 23, 59, 59).getTime();

      setPickerLoading(true);
      setIsPhotoPickerOpen(true);

      const assets = await MediaLibrary.getAssetsAsync({
        createdAfter: startOfDay,
        createdBefore: endOfDay,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: MediaLibrary.SortBy.creationTime,
        first: 100,
      });

      setPickerPhotos(assets.assets);

    } catch (e) {
      console.error(e);
      Alert.alert(t().error, t().couldNotLoadPhotos(e instanceof Error ? e.message : String(e)));
      setIsPhotoPickerOpen(false);
    } finally {
      setPickerLoading(false);
    }
  };

  const handleSelectPhoto = async (asset: MediaLibrary.Asset) => {
    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
      setCroppingImage(assetInfo.localUri || assetInfo.uri);
      setIsPhotoPickerOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Fallback to Standard Picker
  const launchStandardPicker = async (): Promise<string | null> => {
    setIsPhotoPickerOpen(false);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(t().permissionRequired, t().permissionAllowAccess);
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      return result.assets[0].uri;
    }
    return null;
  };

  return {
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
  };
};
