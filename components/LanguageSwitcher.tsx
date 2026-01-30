
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  const [showModal, setShowModal] = useState(false);

  const handleLanguageSelect = (lang: 'en' | 'zh-TW') => {
    console.log('LanguageSwitcher: Language selected', { language: lang });
    setLanguage(lang);
    setShowModal(false);
  };

  const currentLanguageLabel = language === 'en' ? 'EN' : '中';

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowModal(true)}
      >
        <IconSymbol
          ios_icon_name="globe"
          android_material_icon_name="language"
          size={20}
          color={colors.text}
        />
        <Text style={styles.buttonText}>{currentLanguageLabel}</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('language')}</Text>
            
            <TouchableOpacity
              style={[
                styles.languageOption,
                language === 'en' && styles.languageOptionSelected,
              ]}
              onPress={() => handleLanguageSelect('en')}
            >
              <Text
                style={[
                  styles.languageOptionText,
                  language === 'en' && styles.languageOptionTextSelected,
                ]}
              >
                {t('english')}
              </Text>
              {language === 'en' && (
                <IconSymbol
                  ios_icon_name="checkmark"
                  android_material_icon_name="check"
                  size={20}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageOption,
                language === 'zh-TW' && styles.languageOptionSelected,
              ]}
              onPress={() => handleLanguageSelect('zh-TW')}
            >
              <Text
                style={[
                  styles.languageOptionText,
                  language === 'zh-TW' && styles.languageOptionTextSelected,
                ]}
              >
                {t('traditionalChinese')}
              </Text>
              {language === 'zh-TW' && (
                <IconSymbol
                  ios_icon_name="checkmark"
                  android_material_icon_name="check"
                  size={20}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    padding: 20,
    width: '100%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: colors.backgroundAlt,
  },
  languageOptionSelected: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  languageOptionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
});
