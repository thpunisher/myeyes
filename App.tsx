import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BoundingBoxes } from './components/BoundingBoxes';
import { useCamera } from './hooks/useCamera';
import { useDetection } from './hooks/useDetection';
import { useSpeech } from './hooks/useSpeech';
import type { DetectionBox } from '@/types/detection';



export default function App() {
  const [isDark] = useState(true);
  const [detectionActive, setDetectionActive] = useState(false);
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const { hasPermission, requestPermission, cameraRef, isReady } = useCamera();
  const {
    isModelReady,
    boxes,
    startDetecting,
    stopDetecting,
    announceNow,
    handleCommand,
    isListening,
    startListening,
    stopListening
  } = useDetection({ cameraRef, previewSize: layout });
  const { speakObjects } = useSpeech();

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (!detectionActive) return;
    const hasPerson = boxes.some((b) => b.class === 'person');
    if (hasPerson) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [boxes, detectionActive]);

  useEffect(() => {
    if (announceNow) {
      speakObjects(announceNow.objects, announceNow.context);
    }
  }, [announceNow, speakObjects]);

  const onToggleDetection = useCallback(() => {
    if (!detectionActive) {
      startDetecting();
      setDetectionActive(true);
    } else {
      stopDetecting();
      setDetectionActive(false);
    }
  }, [detectionActive, startDetecting, stopDetecting]);

  const onAsk = useCallback(() => {
    if (!isListening) {
      startListening();
    } else {
      stopListening();
    }
  }, [isListening, startListening, stopListening]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-black' : 'bg-white'}`}> 
        <StatusBar barStyle="light-content" />
        <View className="flex-1" onLayout={(e) => setLayout(e.nativeEvent.layout)}>
          {hasPermission ? (
            <View className="flex-1">
              <Camera ref={cameraRef} style={{ flex: 1 }} type={CameraType.back} ratio="16:9">
                <View className="absolute inset-0">
                  <BoundingBoxes boxes={boxes} width={layout.width} height={layout.height} />
                </View>
              </Camera>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-white text-xl">Camera permission required</Text>
            </View>
          )}
        </View>

        <View className="w-full px-4 py-3 border-t border-neutral-800 bg-black/80 flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onToggleDetection}
            className="flex-1 mr-2 py-4 rounded-xl items-center justify-center bg-cyan-500"
          >
            <Text className="text-black text-lg font-semibold">
              {detectionActive ? 'Stop Detection' : 'Start Detection'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onAsk}
            className={`flex-1 ml-2 py-4 rounded-xl items-center justify-center ${isListening ? 'bg-amber-400' : 'bg-amber-500'}`}
          >
            <Text className="text-black text-lg font-semibold">{isListening ? 'Listening…' : 'Ask a Question'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

