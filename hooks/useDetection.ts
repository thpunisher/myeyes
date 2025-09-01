import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as Speech from 'expo-speech';
import { toByteArray } from 'base64-js';
import { Camera } from 'expo-camera';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import type { DetectionBox } from '@/App';
import { saveDetections } from '@/utils/storage';
import Voice, { SpeechResultsEvent, SpeechStartEvent, SpeechEndEvent } from '@react-native-voice/voice';

type UseDetectionArgs = {
  cameraRef: MutableRefObject<Camera | null>;
  previewSize: { width: number; height: number };
};

type AnnouncePayload = { objects: DetectionBox[]; context?: { reason: 'periodic' | 'voice_command' } } | null;

export function useDetection({ cameraRef, previewSize }: UseDetectionArgs) {
  const [isModelReady, setIsModelReady] = useState(false);
  const [boxes, setBoxes] = useState<DetectionBox[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [announceNow, setAnnounceNow] = useState<AnnouncePayload>(null);

  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const lastSpokenSignatureRef = useRef<string>('');
  const lastAnnounceTsRef = useRef<number>(0);
  const loopRef = useRef<NodeJS.Timer | null>(null);

  // Initialize TFJS and model once
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await tf.ready();
        const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        if (!isMounted) return;
        modelRef.current = model;
        setIsModelReady(true);
      } catch (e) {
        console.warn('TF init error', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const estimateDistanceMeters = useCallback((bbox: [number, number, number, number]) => {
    const heightNorm = bbox[3];
    if (heightNorm <= 0) return undefined;
    // simple inverse proportionality, tuned for 16:9 preview
    const k = 1.6;
    const meters = Math.max(0.5, Math.min(8, k / heightNorm));
    return meters;
  }, []);

  const classifyPosition = useCallback((bbox: [number, number, number, number]) => {
    const centerX = bbox[0] + bbox[2] / 2;
    if (centerX < 0.33) return 'left' as const;
    if (centerX > 0.66) return 'right' as const;
    return 'center' as const;
  }, []);

  const processPredictions = useCallback(
    (preds: cocoSsd.DetectedObject[], imgWidth: number, imgHeight: number): DetectionBox[] => {
      const results: DetectionBox[] = preds.map((p, idx) => {
        const [x, y, w, h] = p.bbox; // pixels
        const bbox: [number, number, number, number] = [x / imgWidth, y / imgHeight, w / imgWidth, h / imgHeight];
        return {
          id: `${Date.now()}-${idx}`,
          class: p.class,
          score: p.score ?? 0,
          bbox,
          distance: estimateDistanceMeters(bbox),
          position: classifyPosition(bbox)
        };
      });
      return results.sort((a, b) => (a.distance ?? 9) - (b.distance ?? 9));
    },
    [classifyPosition, estimateDistanceMeters]
  );

  const captureAndDetect = useCallback(async () => {
    if (!cameraRef.current || !modelRef.current) return;
    try {
      const picture = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.4, skipProcessing: true });
      if (!picture?.base64 || !picture.width || !picture.height) return;
      const width = picture.width;
      const height = picture.height;
      const u8 = toByteArray(picture.base64);
      const imgTensor = tf.tidy(() => {
        const decoded = (tf as any).reactNative?.decodeJpeg?.(u8, 3);
        return decoded;
      });
      const predictions = await modelRef.current.detect(imgTensor as any, undefined, 0.3);
      const processed = processPredictions(predictions, width, height);
      setBoxes(processed);

      const signature = processed.map((p) => p.class).join(',');
      const now = Date.now();
      const elapsed = now - lastAnnounceTsRef.current;
      const shouldAnnounce = signature !== lastSpokenSignatureRef.current && elapsed > 3000;
      if (shouldAnnounce) {
        lastSpokenSignatureRef.current = signature;
        lastAnnounceTsRef.current = now;
        setAnnounceNow({ objects: processed, context: { reason: 'periodic' } });
        saveDetections({ timestamp: now, labels: processed.map((p) => p.class) });
      }
      tf.dispose([imgTensor]);
    } catch (e) {
      // Ignore frame errors
    }
  }, [cameraRef, processPredictions]);

  const startDetecting = useCallback(() => {
    if (!modelRef.current || !cameraRef.current) return;
    if (loopRef.current) return;
    setIsDetecting(true);
    loopRef.current = setInterval(captureAndDetect, 700);
  }, [captureAndDetect, cameraRef]);

  const stopDetecting = useCallback(() => {
    setIsDetecting(false);
    if (loopRef.current) {
      clearInterval(loopRef.current as any);
      loopRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (loopRef.current) clearInterval(loopRef.current as any);
    };
  }, []);

  // Voice input
  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const text = (e.value?.[0] ?? '').toLowerCase();
      if (!text) return;
      handleCommand(text);
    };
    Voice.onSpeechStart = (_e: SpeechStartEvent) => setIsListening(true);
    Voice.onSpeechEnd = (_e: SpeechEndEvent) => setIsListening(false);
    return () => {
      Voice.destroy().catch(() => {});
      Voice.removeAllListeners();
    };
  }, []);

  const startListening = useCallback(async () => {
    try {
      await Voice.start('en-US');
    } catch {}
  }, []);

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
    } catch {}
  }, []);

  const handleCommand = useCallback(
    (text: string) => {
      const lower = text.toLowerCase().trim();
      if (lower.includes('what do you see')) {
        const phrase = boxes.length
          ? boxes
              .slice(0, 5)
              .map((o) => (o.distance ? `${o.class} ${o.position} ${o.distance?.toFixed(1)} meters` : `${o.class} ${o.position}`))
              .join(', ')
          : 'I do not see anything.';
        Speech.speak(phrase, { language: 'en-US' });
        return;
      }
      if (lower.includes('how many people')) {
        const count = boxes.filter((b) => b.class === 'person').length;
        Speech.speak(`${count} ${count === 1 ? 'person' : 'people'}`, { language: 'en-US' });
        return;
      }
      if (lower.includes('nearest') || lower.includes('closest')) {
        const nearest = boxes.reduce<DetectionBox | null>((acc, b) => {
          if (!acc) return b;
          const da = acc.distance ?? 999;
          const db = b.distance ?? 999;
          return db < da ? b : acc;
        }, null);
        if (!nearest) {
          Speech.speak('No objects detected.', { language: 'en-US' });
          return;
        }
        const textOut = nearest.distance
          ? `${nearest.class} to your ${nearest.position}, ${nearest.distance.toFixed(1)} meters`
          : `${nearest.class} to your ${nearest.position}`;
        Speech.speak(textOut, { language: 'en-US' });
        return;
      }
      // fallback
      Speech.speak('I can answer: what do you see, how many people, nearest object.', { language: 'en-US' });
    },
    [boxes]
  );

  return {
    isModelReady,
    boxes,
    startDetecting,
    stopDetecting,
    announceNow,
    handleCommand,
    isListening,
    startListening,
    stopListening
  } as const;
}

