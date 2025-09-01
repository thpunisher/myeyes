## MyEyes (Expo SDK 53, TypeScript)

An accessibility-focused app that detects objects and people on-device, speaks what it sees, and supports voice commands.

### Features
- Camera object detection with COCO-SSD + TFJS React Native
- Voice output (`expo-speech`) and input (`@react-native-voice/voice`)
- Haptic feedback for person detections
- Bounding boxes overlay with `react-native-svg`
- Persistence of last 20 detections via AsyncStorage
- Tailwind styling with `nativewind`

### Requirements
- Node.js 20+
- Android Studio or Xcode for device builds

### Install & Run
```bash
npm install --legacy-peer-deps
npx expo install
npm run start
```

Run on device:
- Android: `npm run android`
- iOS: `npm run ios`

### Notes
- Inference runs locally; no paid APIs.
- First load may take a few seconds.
- Allow camera and microphone permissions.

