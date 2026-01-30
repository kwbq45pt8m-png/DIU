
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import Button from '@/components/button';

export default function UsernameSetupScreen() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const router = useRouter();

  const handleSubmit = async () => {
    console.log('Username setup: Submit clicked', { username });
    
    if (!username.trim()) {
      setErrorModal({ visible: true, message: 'Please enter a username' });
      return;
    }

    if (username.length < 3) {
      setErrorModal({ visible: true, message: 'Username must be at least 3 characters' });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setErrorModal({ visible: true, message: 'Username can only contain letters, numbers, and underscores' });
      return;
    }

    setLoading(true);
    console.log('Username setup: Validating username', { username });

    try {
      const { authenticatedPost } = await import('@/utils/api');
      await authenticatedPost('/api/users/setup-username', { username: username.trim() });
      console.log('Username setup: Success, navigating to home');
      router.replace('/(tabs)/(home)/');
    } catch (error: any) {
      console.error('Username setup: Error', error);
      setLoading(false);
      
      // Check if username is already taken
      if (error.message?.includes('already taken') || error.message?.includes('exists')) {
        setErrorModal({ visible: true, message: 'This username is already taken. Please choose another one.' });
      } else {
        setErrorModal({ visible: true, message: 'Failed to set username. Please try again.' });
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Username</Text>
          <Text style={styles.subtitle}>
            This is how others will see you on DIU. Choose wisely - it&apos;s permanent!
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor={colors.textSecondary}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          <Text style={styles.hint}>
            3-20 characters, letters, numbers, and underscores only
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            onPress={handleSubmit}
            variant="primary"
            size="large"
            loading={loading}
            disabled={loading || !username.trim()}
          >
            Continue
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    ...commonStyles.title,
    fontSize: 32,
    marginBottom: 12,
  },
  subtitle: {
    ...commonStyles.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  hint: {
    ...commonStyles.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
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
