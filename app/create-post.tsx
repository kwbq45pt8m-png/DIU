
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/button';

export default function CreatePostScreen() {
  const [postContent, setPostContent] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{
    uri: string;
    type: 'image';
    fileName?: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showAdModal && adCountdown > 0) {
      interval = setInterval(() => {
        setAdCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showAdModal, adCountdown]);

  const pickImage = async () => {
    console.log('[CreatePost] Opening image picker');
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.log('[CreatePost] Media library permission denied');
      alert(t('permissionDenied') || 'Permission to access media library was denied');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      console.log('[CreatePost] Image selected', { 
        uri: asset.uri,
        fileName: asset.fileName,
        fileSize: asset.fileSize 
      });
      
      // Validate file size before setting (10MB max for images)
      const maxSize = 10 * 1024 * 1024;
      
      if (asset.fileSize && asset.fileSize > maxSize) {
        const sizeInMB = (asset.fileSize / (1024 * 1024)).toFixed(1);
        alert(t('imageTooLarge') || `Image file is too large (${sizeInMB}MB). Maximum size is 10MB.`);
        return;
      }
      
      setSelectedMedia({
        uri: asset.uri,
        type: 'image',
        fileName: asset.fileName,
      });
    }
  };

  const removeMedia = () => {
    console.log('[CreatePost] Removing selected image');
    setSelectedMedia(null);
  };

  const handleSubmit = async () => {
    const trimmedContent = postContent.trim();
    
    if (!trimmedContent && !selectedMedia) {
      console.log('[CreatePost] Empty post, ignoring');
      return;
    }

    console.log('[CreatePost] Showing ad modal before posting');
    setShowAdModal(true);
    setAdCountdown(5);
  };

  const finishPost = async () => {
    console.log('[CreatePost] Finishing post after ad');
    setShowAdModal(false);
    setUploading(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      
      let mediaKey: string | undefined;
      let mediaType: 'image' | undefined;

      // Upload image if selected
      if (selectedMedia) {
        console.log('[CreatePost] Uploading image');
        
        const formData = new FormData();
        formData.append('media', {
          uri: selectedMedia.uri,
          name: selectedMedia.fileName || 'upload.jpg',
          type: 'image/jpeg',
        } as any);

        const uploadResponse = await authenticatedPost<{ url: string; mediaKey: string; mediaType: 'image' | 'video' }>(
          '/api/upload/media',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        console.log('[CreatePost] Image uploaded successfully', { mediaKey: uploadResponse.mediaKey });
        mediaKey = uploadResponse.mediaKey;
        mediaType = 'image';
      }

      // Create post with mediaKey (not mediaUrl)
      const postData: { content: string; mediaKey?: string; mediaType?: 'image' } = {
        content: postContent.trim(),
      };

      if (mediaKey && mediaType) {
        postData.mediaKey = mediaKey;
        postData.mediaType = mediaType;
      }

      console.log('[CreatePost] Creating post', postData);
      await authenticatedPost('/api/posts', postData);
      
      console.log('[CreatePost] Post created successfully');
      router.back();
    } catch (error: any) {
      console.error('[CreatePost] Error creating post', error);
      
      // Handle specific error cases
      let errorMessage = t('postFailed') || 'Failed to create post. Please try again.';
      
      if (error.status === 413) {
        errorMessage = t('fileTooLarge') || 'File is too large. Images must be under 10MB.';
      } else if (error.status === 400) {
        // Try to parse the error message from the backend
        try {
          const errorData = JSON.parse(error.response);
          errorMessage = errorData.message || t('invalidFileFormat') || 'Invalid file format. Please select a valid image.';
        } catch {
          errorMessage = t('invalidFileFormat') || 'Invalid file format. Please select a valid image.';
        }
      } else if (error.message && error.message.includes('Authentication token')) {
        errorMessage = t('authRequired') || 'Please sign in to create a post.';
      }
      
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const canSubmitText = postContent.trim() || selectedMedia ? t('post') : t('postEmpty');
  const canSubmit = !!(postContent.trim() || selectedMedia);
  const adTitleText = t('adTitle');
  const adMessageText = t('adMessage');
  const postPlaceholderText = t('postPlaceholder');
  const addMediaText = t('addImage');
  const uploadingText = t('uploading');
  
  // Button text logic
  const continueButtonText = adCountdown > 0 ? `${t('continue')} (${adCountdown}s)` : t('continue');
  const isButtonDisabled = adCountdown > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{ 
          title: t('createPost'),
          headerShown: true,
          headerBackVisible: true,
          headerBackTitle: 'Back',
        }} 
      />

      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <TextInput
            style={styles.input}
            placeholder={postPlaceholderText}
            placeholderTextColor={colors.textSecondary}
            value={postContent}
            onChangeText={setPostContent}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />

          {selectedMedia && (
            <View style={styles.mediaPreview}>
              <Image source={{ uri: selectedMedia.uri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeButton} onPress={removeMedia}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={32}
                  color="#FF3B30"
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
                color={colors.primary}
              />
              <Text style={styles.mediaButtonText}>{addMediaText}</Text>
            </TouchableOpacity>
            
            <Text style={styles.helperText}>
              {t('imageLimits') || 'Images: 10MB max'}
            </Text>
          </View>

          <View style={styles.characterCount}>
            <Text style={styles.characterCountText}>
              {postContent.length}/500
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            onPress={handleSubmit}
            disabled={!canSubmit || uploading}
            loading={uploading}
          >
            {uploading ? uploadingText : canSubmitText}
          </Button>
        </View>
      </KeyboardAvoidingView>

      {/* Ad Modal */}
      <Modal
        visible={showAdModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{adTitleText}</Text>
            <Text style={styles.modalMessage}>{adMessageText}</Text>
            
            <View style={styles.adPlaceholder}>
              <Text style={styles.adText}>📢 {t('adSpace')}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.continueButton, isButtonDisabled && styles.continueButtonDisabled]}
              onPress={finishPost}
              disabled={isButtonDisabled}
            >
              <Text style={styles.continueButtonText}>{continueButtonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  input: {
    fontSize: 16,
    color: colors.text,
    minHeight: 200,
    textAlignVertical: 'top',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mediaPreview: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.background,
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  actions: {
    marginTop: 16,
    gap: 8,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mediaButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    paddingHorizontal: 4,
  },
  characterCount: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  characterCountText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  adPlaceholder: {
    height: 200,
    backgroundColor: colors.background,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  adText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
