
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { colors } from '@/styles/commonStyles';
import { useLanguage } from '@/contexts/LanguageContext';
import * as Haptics from 'expo-haptics';

// Generate a proper WAV file with a beep sound
function generateBeepWAV(): string {
  const sampleRate = 44100;
  const duration = 0.3; // 300ms beep
  const frequency = 440; // A4 note
  const numSamples = Math.floor(sampleRate * duration);
  
  // WAV file header
  const header = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0, 0, 0, 0, // File size (will be filled later)
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    0x66, 0x6D, 0x74, 0x20, // "fmt "
    16, 0, 0, 0, // Subchunk1Size (16 for PCM)
    1, 0, // AudioFormat (1 for PCM)
    1, 0, // NumChannels (1 for mono)
    0x44, 0xAC, 0, 0, // SampleRate (44100)
    0x88, 0x58, 0x01, 0, // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    2, 0, // BlockAlign (NumChannels * BitsPerSample/8)
    16, 0, // BitsPerSample (16)
    0x64, 0x61, 0x74, 0x61, // "data"
    0, 0, 0, 0, // Subchunk2Size (will be filled later)
  ]);

  // Generate audio samples
  const samples = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, Math.max(0, 1 - (i / numSamples))); // Fade out
    samples[i] = Math.floor(32767 * 0.3 * envelope * Math.sin(2 * Math.PI * frequency * t));
  }

  // Convert samples to bytes
  const dataBytes = new Uint8Array(samples.buffer);
  
  // Update file size in header
  const fileSize = header.length + dataBytes.length - 8;
  header[4] = fileSize & 0xFF;
  header[5] = (fileSize >> 8) & 0xFF;
  header[6] = (fileSize >> 16) & 0xFF;
  header[7] = (fileSize >> 24) & 0xFF;
  
  // Update data chunk size
  const dataSize = dataBytes.length;
  header[40] = dataSize & 0xFF;
  header[41] = (dataSize >> 8) & 0xFF;
  header[42] = (dataSize >> 16) & 0xFF;
  header[43] = (dataSize >> 24) & 0xFF;

  // Combine header and data
  const wavFile = new Uint8Array(header.length + dataBytes.length);
  wavFile.set(header, 0);
  wavFile.set(dataBytes, header.length);

  // Convert to base64
  let binary = '';
  for (let i = 0; i < wavFile.length; i++) {
    binary += String.fromCharCode(wavFile[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

export default function DIUScreen() {
  const { t } = useLanguage();
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const beepDataRef = useRef<string | null>(null);

  const diuText = 'DIU';
  const tapToVentText = t('tapToVent');
  const releaseYourAngerText = t('releaseYourAnger');

  const playDIUSound = async () => {
    console.log('DIU: Playing DIU sound');
    try {
      // Unload previous sound if exists
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Generate beep sound if not already generated
      if (!beepDataRef.current) {
        console.log('DIU: Generating beep sound');
        beepDataRef.current = generateBeepWAV();
      }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: beepDataRef.current },
        { shouldPlay: true, volume: 0.8 }
      );
      
      soundRef.current = sound;

      // Unload sound after it finishes playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
      
      console.log('DIU: Sound played successfully');
    } catch (error) {
      console.error('DIU: Error playing sound', error);
      // Fallback: just provide haptic feedback if sound fails
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handlePressIn = () => {
    console.log('DIU: Button pressed');
    setIsPressed(true);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    // Animate button press
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      speed: 50,
      bounciness: 10,
    }).start();
  };

  const handlePressOut = () => {
    console.log('DIU: Button released');
    setIsPressed(false);

    // Animate button release
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 10,
    }).start();

    // Play sound
    playDIUSound();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{diuText}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionTitle}>{tapToVentText}</Text>
          <Text style={styles.instructionSubtitle}>{releaseYourAngerText}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            activeOpacity={1}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.buttonTouchable}
          >
            <Animated.View
              style={[
                styles.diuButton,
                {
                  transform: [{ scale: scaleAnim }],
                  backgroundColor: isPressed ? colors.primaryDark : colors.primary,
                },
              ]}
            >
              <Text style={styles.diuButtonText}>{diuText}</Text>
            </Animated.View>
          </TouchableOpacity>
        </View>

        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            {t('pressAndHold')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructionContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  instructionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  diuButton: {
    width: 280,
    height: 280,
    borderRadius: 140,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  diuButtonText: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  hintContainer: {
    marginTop: 60,
    paddingHorizontal: 40,
  },
  hintText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
