
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, StatusBar, Platform, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

const { width, height } = Dimensions.get('window');

export default function MediaViewerScreen() {
  const params = useLocalSearchParams<{ url?: string; mediaUrl?: string; type?: string; mediaType?: string }>();
  const router = useRouter();
  const [videoRef, setVideoRef] = useState<Video | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Handle both 'url' and 'mediaUrl' params for backwards compatibility
  const mediaUrl = params.url || params.mediaUrl;
  const mediaType = (params.type || params.mediaType) as 'image' | 'video' | undefined;

  useEffect(() => {
    console.log('[MediaViewer] Component mounted', { mediaUrl, mediaType });
    
    // Validate params
    if (!mediaUrl || !mediaType) {
      console.error('[MediaViewer] Missing required params', { mediaUrl, mediaType });
      setImageError(true);
    }
  }, []);

  const handleClose = () => {
    console.log('[MediaViewer] User closed viewer');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/(home)');
    }
  };

  const handleImageLoadStart = () => {
    console.log('[MediaViewer] Image load started');
    setImageLoading(true);
    setImageError(false);
  };

  const handleImageLoad = () => {
    console.log('[MediaViewer] Image loaded successfully');
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = (error: any) => {
    console.error('[MediaViewer] Image load failed:', error?.nativeEvent?.error || 'Unknown error');
    setImageLoading(false);
    setImageError(true);
  };

  // Show error if no media URL or type
  if (!mediaUrl || !mediaType) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{ 
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'fade',
          }} 
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Media not found</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={handleClose}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        {mediaType === 'image' ? (
          <>
            <Image
              source={{ uri: mediaUrl }}
              style={styles.fullscreenImage}
              resizeMode="contain"
              onLoadStart={handleImageLoadStart}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            {imageLoading && !imageError && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Loading image...</Text>
              </View>
            )}
            {imageError && (
              <View style={styles.errorContainer}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle"
                  android_material_icon_name="error"
                  size={48}
                  color="#FFFFFF"
                />
                <Text style={styles.errorText}>Failed to load image</Text>
                <Text style={styles.errorSubtext}>The image may have been removed or the link expired</Text>
                <TouchableOpacity 
                  style={styles.errorButton}
                  onPress={handleClose}
                >
                  <Text style={styles.errorButtonText}>Go Back</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : null}

        {mediaType === 'video' ? (
          <Video
            ref={(ref) => setVideoRef(ref)}
            source={{ uri: mediaUrl }}
            style={styles.fullscreenVideo}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping={false}
            onError={(error) => {
              console.error('[MediaViewer] Video load failed:', error);
            }}
          />
        ) : null}
      </View>

      {/* Close Button */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={handleClose}
        activeOpacity={0.8}
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
    gap: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
  errorSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
