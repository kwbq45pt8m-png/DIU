
import React, { useState, useEffect } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { useLanguage } from '@/contexts/LanguageContext';

interface EditPostModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  initialContent: string;
  onUpdate: (postId: string, content: string) => Promise<void>;
}

export function EditPostModal({
  visible,
  onClose,
  postId,
  initialContent,
  onUpdate,
}: EditPostModalProps) {
  const { t } = useLanguage();
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setContent(initialContent);
      setError('');
    }
  }, [visible, initialContent]);

  const handleUpdate = async () => {
    if (!content.trim()) {
      setError(t('postEmptyError'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onUpdate(postId, content.trim());
      onClose();
    } catch (err) {
      console.error('[EditPostModal] Error updating post', err);
      setError(t('postError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Text style={styles.cancelButton}>{t('cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t('editPostTitle')}</Text>
            <TouchableOpacity onPress={handleUpdate} disabled={loading || !content.trim()}>
              <Text
                style={[
                  styles.updateButton,
                  (loading || !content.trim()) && styles.updateButtonDisabled,
                ]}
              >
                {loading ? t('updating') : t('updatePost')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentContainer}>
            <TextInput
              style={styles.textInput}
              value={content}
              onChangeText={setContent}
              placeholder={t('postPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
              autoFocus
              editable={!loading}
            />

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.charCount}>
              {content.length} {t('charCount')}
            </Text>
          </ScrollView>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  cancelButton: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  updateButton: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  updateButtonDisabled: {
    opacity: 0.5,
  },
  contentContainer: {
    padding: 16,
  },
  textInput: {
    fontSize: 16,
    color: colors.text,
    minHeight: 150,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  charCount: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  errorContainer: {
    backgroundColor: '#FF3B3020',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
