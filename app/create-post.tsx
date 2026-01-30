
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import Button from '@/components/button';

export default function CreatePostScreen() {
  const [content, setContent] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const router = useRouter();

  const pickImage = async () => {
    console.log('CreatePost: Pick image button pressed');
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      setErrorModal({ visible: true, message: 'Please allow access to your photo library' });
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
      setErrorModal({ visible: true, message: 'Please add some content or media to your post' });
      return;
    }

    setLoading(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      let uploadedMediaUrl: string | undefined;
      let uploadedMediaType: 'image' | 'video' | undefined;

      // Step 1: Upload media if present
      if (mediaUri && mediaType) {
        console.log('CreatePost: Uploading media', { mediaType });
        
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
        
        const uploadResponse = await fetch(`${BACKEND_URL}/api/upload/media`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload media');
        }

        const uploadData = await uploadResponse.json();
        uploadedMediaUrl = uploadData.url;
        uploadedMediaType = uploadData.mediaType;
        console.log('CreatePost: Media uploaded successfully', { url: uploadedMediaUrl });
      }

      // Step 2: Create post
      console.log('CreatePost: Creating post');
      const postData: any = {
        content: content.trim(),
      };

      if (uploadedMediaUrl) {
        postData.mediaUrl = uploadedMediaUrl;
        postData.mediaType = uploadedMediaType;
      }

      await authenticatedPost('/api/posts', postData);
      console.log('CreatePost: Post created successfully');
      
      setLoading(false);
      router.back();
    } catch (error) {
      console.error('CreatePost: Error creating post', error);
      setLoading(false);
      setErrorModal({ visible: true, message: 'Failed to create post. Please try again.' });
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Create Post',
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
                placeholder="What's on your mind? Let it out..."
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
                    <Text style={styles.videoText}>Video selected</Text>
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
                <Text style={styles.mediaButtonText}>Add Photo/Video</Text>
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
              Post
            </Button>
          </View>
        </KeyboardAvoidingView>

        <Modal
          visible={errorModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setErrorModal({ visible: false, message: '' })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Error</Text>
              <Text style={styles.modalText}>{errorModal.message}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setErrorModal({ visible: false, message: '' })}
              >
                <Text style={styles.modalButtonText}>OK</Text>
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
