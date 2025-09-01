import AsyncStorage from '@react-native-async-storage/async-storage';

export type StoredDetection = {
  timestamp: number;
  labels: string[];
};

const KEY = 'myeyes:lastDetections';

export async function saveDetections(detections: StoredDetection) {
  try {
    const json = await AsyncStorage.getItem(KEY);
    const arr: StoredDetection[] = json ? JSON.parse(json) : [];
    const next = [detections, ...arr].slice(0, 20);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export async function getDetections(): Promise<StoredDetection[]> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

