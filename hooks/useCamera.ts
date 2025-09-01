import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera } from 'expo-camera';

export function useCamera() {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const cameraRef = useRef<Camera | null>(null);

  const requestPermission = useCallback(async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  }, []);

  const onCameraReady = useCallback(() => setIsReady(true), []);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.getCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  return {
    hasPermission,
    requestPermission,
    cameraRef,
    isReady,
    onCameraReady
  } as const;
}

