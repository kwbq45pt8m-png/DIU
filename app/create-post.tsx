
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import Button from '@/components/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CreatePostScreen() {
  const [content, setContent] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [showAdModal, setShowAdModal] = useState(false);
  const [adCountdown, setAdCountdown] = useState(10);
  const router = useRouter();
  const { t } = useLanguage();

  // Ad countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showAdModal && adCountdown > 0) {
      timer = setTimeout(() => {
        setAdCountdown(adCountdown - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showAdModal, adCountdown]);

  const pickImage = async () => {
    console.log('CreatePost: Pick image button pressed');
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      setErrorModal({ visible: true, message: t('mediaPermissionError') });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('CreatePost: Media selected', { type: result.assets[0].type });
      setMediaUri(result.assets[0].uri);
      setMediaType(result.assets[0].type === 'video' ? 'video' : 'image');
    }
  };

  const removeMedia = () => {
    console.log('CreatePost: Remove media button pressed');
    setMediaUri(null);
    setMediaType(null);
  };

  const handleSubmit = async () => {
    console.log('CreatePost: Submit button pressed', { hasContent: !!content, hasMedia: !!mediaUri });
    
    if (!content.trim() && !mediaUri) {
      console.log('CreatePost: Validation failed - empty content');
      setErrorModal({ visible: true, message: t('postEmptyError') });
      return;
    }

    // Show ad modal before posting
    console.log('CreatePost: Showing ad modal');
    setShowAdModal(true);
    setAdCountdown(10);
  };

  const finishPost = async () => {
    console.log('CreatePost: Finishing post after ad');
    setShowAdModal(false);
    setLoading(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      let uploadedMediaUrl: string | undefined;
      let uploadedMediaType: 'image' | 'video' | undefined;

      // Step 1: Upload media if present
      if (mediaUri && mediaType) {
        console.log('CreatePost: Uploading media', { mediaType, uri: mediaUri });
        
        // Create FormData for media upload
        const formData = new FormData();
        const filename = mediaUri.split('/').pop() || 'media';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `${mediaType}/${match[1]}` : mediaType;
        
        formData.append('media', {
          uri: mediaUri,
          name: filename,
          type,
        } as any);

        // Upload media
        const { BACKEND_URL } = await import('@/utils/api');
        const { getBearerToken } = await import('@/utils/api');
        const token = await getBearerToken();
        
        console.log('CreatePost: Uploading to', `${BACKEND_URL}/api/upload/media`);
        const uploadResponse = await fetch(`${BACKEND_URL}/api/upload/media`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('CreatePost: Media upload failed', { status: uploadResponse.status, error: errorText });
          
          // Handle specific error cases
          if (uploadResponse.status === 413) {
            throw new Error('File is too large. Maximum size is 100MB.');
          } else if (uploadResponse.status === 400) {
            throw new Error('Invalid file format. Please select a valid image or video.');
          } else {
            throw new Error('Failed to upload media. Please try again.');
          }
        }

        const uploadData = await uploadResponse.json();
        uploadedMediaUrl = uploadData.url;
        uploadedMediaType = uploadData.mediaType;
        console.log('CreatePost: Media uploaded successfully', { url: uploadedMediaUrl });
      }

      // Step 2: Create post
      console.log('CreatePost: Creating post with data', { 
        hasContent: !!content.trim(), 
        hasMedia: !!uploadedMediaUrl 
      });
      const postData: any = {};

      // Only add content if it's not empty
      if (content.trim()) {
        postData.content = content.trim();
      }

      if (uploadedMediaUrl) {
        postData.mediaUrl = uploadedMediaUrl;
        postData.mediaType = uploadedMediaType;
      }

      const result = await authenticatedPost('/api/posts', postData);
      console.log('CreatePost: Post created successfully', result);
      
      setLoading(false);
      console.log('CreatePost: Navigating back to home');
      router.back();
    } catch (error: any) {
      console.error('CreatePost: Error creating post', { 
        error: error.message, 
        stack: error.stack,
        response: error.response 
      });
      setLoading(false);
      
      // Show specific error message if available
      const errorMessage = error.message || t('postError');
      setErrorModal({ visible: true, message: errorMessage });
    }
  };

  const canSkipAd = adCountdown === 0;

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: t('createPost'),
          headerStyle: { backgroundColor: colors.backgroundAlt },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('postPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={content}
                onChangeText={setContent}
                multiline
                maxLength={500}
                autoFocus
              />
              <Text style={styles.charCount}>
                {content.length}/500
              </Text>
            </View>

            {mediaUri && (
              <View style={styles.mediaPreview}>
                {mediaType === 'image' && (
                  <Image source={{ uri: mediaUri }} style={styles.previewImage} />
                )}
                {mediaType === 'video' && (
                  <View style={styles.videoPlaceholder}>
                    <IconSymbol
                      ios_icon_name="play.circle.fill"
                      android_material_icon_name="play-circle-filled"
                      size={48}
                      color={colors.text}
                    />
                    <Text style={styles.videoText}>{t('videoSelected')}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.removeButton} onPress={removeMedia}>
                  <IconSymbol
                    ios_icon_name="xmark.circle.fill"
                    android_material_icon_name="cancel"
                    size={24}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
                <IconSymbol
                  ios_icon_name="photo"
                  android_material_icon_name="image"
                  size={24}
                  color={colors.text}
                />
                <Text style={styles.mediaButtonText}>{t('addPhotoVideo')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              onPress={handleSubmit}
              variant="filled"
              size="lg"
              loading={loading}
              disabled={loading || (!content.trim() && !mediaUri)}
            >
              {t('post')}
            </Button>
          </View>
        </KeyboardAvoidingView>

        {/* Ad Modal */}
        <Modal
          visible={showAdModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (canSkipAd) {
              setShowAdModal(false);
            }
          }}
        >
          <View style={styles.adModalOverlay}>
            <View style={styles.adModalContent}>
              <View style={styles.adHeader}>
                <Text style={styles.adTitle}>{t('adTitle')}</Text>
                <Text style={styles.adSubtitle}>{t('adSubtitle')}</Text>
              </View>

              <View style={styles.adBody}>
                <View style={styles.adPlaceholder}>
                  <IconSymbol
                    ios_icon_name="play.circle.fill"
                    android_material_icon_name="play-circle-filled"
                    size={64}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.adPlaceholderText}>{t('adContent')}</Text>
                </View>
              </View>

              <View style={styles.adFooter}>
                {!canSkipAd ? (
                  <View style={styles.countdownContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.countdownText}>
                      {t('adWait')} {adCountdown}s
                    </Text>
                  </View>
                ) : (
                  <Button
                    onPress={finishPost}
                    variant="filled"
                    size="lg"
                  >
                    {t('adContinue')}
                  </Button>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* Error Modal */}
        <Modal
          visible={errorModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setErrorModal({ visible: false, message: '' })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('error')}</Text>
              <Text style={styles.modalText}>{errorModal.message}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setErrorModal({ visible: false, message: '' })}
              >
                <Text style={styles.modalButtonText}>{t('ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  mediaPreview: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  videoPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  videoText: {
    fontSize: 14,
    color: colors.text,
    marginTop: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  actions: {
    marginBottom: 16,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  mediaButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  adModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  adModalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  adHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  adTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  adSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  adBody: {
    padding: 20,
  },
  adPlaceholder: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  adPlaceholderText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  adFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  countdownText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
