
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { colors } from '@/styles/commonStyles';
import { useLanguage } from '@/contexts/LanguageContext';
import * as Haptics from 'expo-haptics';

export default function DIUScreen() {
  const { t } = useLanguage();
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const diuText = 'DIU';
  const tapToVentText = t('tapToVent');
  const releaseYourAngerText = t('releaseYourAnger');

  const playDIUSound = async () => {
    console.log('DIU: Playing Chinese pronunciation for 屌');
    try {
      // Stop any ongoing speech
      await Speech.stop();

      // Speak "屌" (diu) with Chinese pronunciation
      Speech.speak('屌', {
        language: 'zh-CN', // Chinese (Simplified) - works for Cantonese pronunciation
        pitch: 1.0,
        rate: 1.0,
        volume: 1.0,
      });
      
      console.log('DIU: Speech started successfully');
    } catch (error) {
      console.error('DIU: Error speaking 屌', error);
      // Fallback: just provide haptic feedback if speech fails
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

    // Play DIU pronunciation
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
