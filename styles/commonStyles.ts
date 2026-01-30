
import { StyleSheet } from 'react-native';

// DIU - Bold, expressive colors for an anonymous venting platform
export const colors = {
  primary: '#FF3B30',      // Bold Red - for anger/venting theme
  secondary: '#FF6B6B',    // Lighter Red
  accent: '#FFD60A',       // Warning Yellow
  background: '#000000',   // Pure Black
  backgroundAlt: '#1C1C1E', // Dark Gray
  text: '#FFFFFF',         // White text
  textSecondary: '#8E8E93', // Gray text
  card: '#2C2C2E',         // Dark card background
  border: '#38383A',       // Border color
  success: '#34C759',      // Green for success
  highlight: '#FF9500',    // Orange highlight
};

export const buttonStyles = StyleSheet.create({
  primaryButton: {
    backgroundColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
  },
  secondaryButton: {
    backgroundColor: colors.backgroundAlt,
    alignSelf: 'center',
    width: '100%',
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 24,
  },
  textSecondary: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    width: '100%',
  },
});
