import * as Speech from 'expo-speech';
import { useCallback, useRef } from 'react';
import type { DetectionBox } from '@/types/detection';

type SpeakContext = {
  reason: 'periodic' | 'voice_command';
};

export function useSpeech() {
  const lastUtteranceRef = useRef<string>('');

  const describeObjects = useCallback((objects: DetectionBox[]): string => {
    if (!objects.length) return 'I see nothing of interest.';
    const top = objects.slice(0, 5);
    const phrases = top.map((o) => {
      const where = o.position ?? 'center';
      const dist = o.distance ? `${Math.max(0.5, Math.round(o.distance * 10) / 10)} meters` : '';
      return dist ? `${o.class} to your ${where}, ${dist}` : `${o.class} to your ${where}`;
    });
    return phrases.join(', ');
  }, []);

  const speakObjects = useCallback((objects: DetectionBox[], context?: SpeakContext) => {
    const text = describeObjects(objects);
    if (text === lastUtteranceRef.current) return;
    lastUtteranceRef.current = text;
    Speech.speak(text, {
      language: 'en-US',
      rate: 1.0,
      pitch: 1.0
    });
  }, [describeObjects]);

  const speakText = useCallback((text: string) => {
    if (!text) return;
    if (text === lastUtteranceRef.current) return;
    lastUtteranceRef.current = text;
    Speech.speak(text, { language: 'en-US' });
  }, []);

  return { speakObjects, speakText } as const;
}

