
import React, { ReactNode } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { colors } from '@/styles/commonStyles';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  children?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  confirmDestructive?: boolean;
  showCancel?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  message,
  children,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  confirmDestructive = false,
  showCancel = true,
}: ModalProps) {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {title && <Text style={styles.title}>{title}</Text>}
              
              {message && <Text style={styles.message}>{message}</Text>}
              
              {children}

              <View style={styles.buttonContainer}>
                {showCancel && (
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={onClose}
                  >
                    <Text style={styles.cancelButtonText}>{cancelText}</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.confirmButton,
                    confirmDestructive && styles.destructiveButton,
                    !showCancel && styles.singleButton,
                  ]}
                  onPress={handleConfirm}
                >
                  <Text
                    style={[
                      styles.confirmButtonText,
                      confirmDestructive && styles.destructiveButtonText,
                    ]}
                  >
                    {confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  singleButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  destructiveButton: {
    backgroundColor: '#FF3B30',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
  },
});
