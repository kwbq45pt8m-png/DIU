
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, StatusBar, Platform, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

const { width, height } = Dimensions.get('window');

export default function MediaViewerScreen() {
  const { mediaUrl, mediaType } = useLocalSearchParams<{ mediaUrl: string; mediaType: 'image' | 'video' }>();
  const router = useRouter();
  const [videoRef, setVideoRef] = useState<Video | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  console.log('[MediaViewer] Opening media viewer', { mediaUrl, mediaType });

  const handleClose = () => {
    console.log('[MediaViewer] Closing media viewer');
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade',
        }} 
      />
      
      <StatusBar hidden={Platform.OS === 'ios'} />

      {/* Media Content */}
      <View style={styles.mediaContainer}>
        {mediaType === 'image' && mediaUrl ? (
          <>
            <Image
              source={{ uri: mediaUrl }}
              style={styles.fullscreenImage}
              resizeMode="contain"
              onLoadStart={() => {
                console.log('[MediaViewer] Image loading started');
                setImageLoading(true);
                setImageError(false);
              }}
              onLoad={() => {
                console.log('[MediaViewer] Image loaded successfully');
                setImageLoading(false);
              }}
              onError={(error) => {
                console.log('[MediaViewer] Image load error:', error.nativeEvent.error);
                setImageLoading(false);
                setImageError(true);
              }}
            />
            {imageLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
            {imageError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Failed to load image</Text>
              </View>
            )}
          </>
        ) : null}

        {mediaType === 'video' && mediaUrl ? (
          <Video
            ref={(ref) => setVideoRef(ref)}
            source={{ uri: mediaUrl }}
            style={styles.fullscreenVideo}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping={false}
          />
        ) : null}
      </View>

      {/* Close Button */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={handleClose}
      >
        <View style={styles.closeButtonBackground}>
          <IconSymbol
            ios_icon_name="xmark"
            android_material_icon_name="close"
            size={24}
            color="#FFFFFF"
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
  },
  closeButtonBackground: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
