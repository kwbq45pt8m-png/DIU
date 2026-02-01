
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import Button from '@/components/button';
import { authenticatedGet } from '@/utils/api';

interface Stamp {
  stampDate: string;
  createdAt: string;
}

export default function ProfileScreen() {
  const { user, signOut, fetchUser } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [updatingUsername, setUpdatingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [loadingStamps, setLoadingStamps] = useState(false);

  useEffect(() => {
    if (user) {
      console.log('Profile: User data loaded', { userId: user.id, name: user.name, email: user.email });
      loadStamps();
    }
  }, [user]);

  const loadStamps = async () => {
    console.log('Profile: Loading stamps');
    setLoadingStamps(true);
    try {
      const response = await authenticatedGet<Stamp[]>('/api/stamps/my-stamps');
      console.log('Profile: Stamps loaded', { count: response.length });
      setStamps(response);
    } catch (error) {
      console.error('Profile: Error loading stamps', error);
    } finally {
      setLoadingStamps(false);
    }
  };

  const handleLogout = async () => {
    console.log('Profile: Logout confirmed');
    setLoggingOut(true);
    
    try {
      await signOut();
      console.log('Profile: Logout successful');
      setShowLogoutModal(false);
      router.replace('/(tabs)/(home)/');
    } catch (error) {
      console.error('Profile: Logout error', error);
      setLoggingOut(false);
    }
  };

  const handleUpdateUsername = async () => {
    console.log('Profile: Update username button pressed', { newUsername });
    
    // Validation
    if (!newUsername.trim()) {
      setUsernameError(t('usernameRequired'));
      return;
    }
    
    if (newUsername.length < 3) {
      setUsernameError(t('usernameMinLength'));
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      setUsernameError(t('usernameInvalidChars'));
      return;
    }
    
    setUpdatingUsername(true);
    setUsernameError('');
    
    try {
      const { authenticatedPut } = await import('@/utils/api');
      await authenticatedPut('/api/users/profile', { username: newUsername });
      console.log('Profile: Username updated successfully on backend');
      
      // Refresh user data to get the updated username
      await fetchUser();
      console.log('Profile: User data refreshed after username update');
      
      // Close modal and reset
      setShowUsernameModal(false);
      setNewUsername('');
    } catch (error: any) {
      console.error('Profile: Error updating username', error);
      if (error.message.includes('already taken') || error.message.includes('exists')) {
        setUsernameError(t('usernameTaken'));
      } else {
        setUsernameError(t('usernameError'));
      }
    } finally {
      setUpdatingUsername(false);
    }
  };

  const profileText = t('profile');
  const signInToViewProfileText = t('signInToViewProfile');
  const signInProfileMessageText = t('signInProfileMessage');
  const signInText = t('signIn');
  const aboutDIUText = t('aboutDIU');
  const aboutDIUContentText = t('aboutDIUText');
  const guidelinesText = t('guidelines');
  const guidelineRespectText = t('guidelineRespect');
  const guidelineNoHateText = t('guidelineNoHate');
  const guidelineAnonymousText = t('guidelineAnonymous');
  const signOutText = t('signOut');
  const signOutConfirmText = t('signOutConfirm');
  const signOutMessageText = t('signOutMessage');
  const cancelText = t('cancel');
  const signingOutText = t('signingOut');
  const updateUsernameText = t('updateUsername');
  const updateUsernameTitle = t('updateUsernameTitle');
  const updateUsernameMessage = t('updateUsernameMessage');
  const usernamePlaceholderText = t('usernamePlaceholder');
  const usernameHintText = t('usernameHint');
  const updatingText = t('updating');
  const dailyStampsText = t('dailyStamps');
  const stampsCollectedText = t('stampsCollected');
  const noStampsYetText = t('noStampsYet');
  const postToEarnStampText = t('postToEarnStamp');

  // If user is not authenticated, show sign-in prompt
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{profileText}</Text>
          <LanguageSwitcher />
        </View>
        
        <View style={styles.unauthContainer}>
          <View style={styles.unauthIconContainer}>
            <IconSymbol
              ios_icon_name="person.circle"
              android_material_icon_name="account-circle"
              size={80}
              color={colors.textSecondary}
            />
          </View>
          <Text style={styles.unauthTitle}>{signInToViewProfileText}</Text>
          <Text style={styles.unauthSubtitle}>
            {signInProfileMessageText}
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.signInButtonText}>{signInText}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayUsername = user?.name || 'username';
  const stampCount = stamps.length;
  const stampCountText = `${stampCount}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{profileText}</Text>
        <LanguageSwitcher />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={48}
                color={colors.text}
              />
            </View>
          </View>
          
          <View style={styles.usernameContainer}>
            <Text style={styles.username}>@{displayUsername}</Text>
            <TouchableOpacity
              style={styles.editUsernameButton}
              onPress={() => {
                setNewUsername(user?.name || '');
                setShowUsernameModal(true);
              }}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.email}>{user?.email || 'email@example.com'}</Text>
        </View>

        {/* Daily Stamps Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{dailyStampsText}</Text>
            {loadingStamps && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
          <View style={styles.stampsCard}>
            <View style={styles.stampsSummary}>
              <View style={styles.stampIconContainer}>
                <IconSymbol
                  ios_icon_name="star.fill"
                  android_material_icon_name="star"
                  size={32}
                  color={colors.primary}
                />
              </View>
              <View style={styles.stampsTextContainer}>
                <Text style={styles.stampsCount}>{stampCountText}</Text>
                <Text style={styles.stampsLabel}>{stampsCollectedText}</Text>
              </View>
            </View>
            
            {stamps.length === 0 ? (
              <View style={styles.noStampsContainer}>
                <Text style={styles.noStampsText}>{noStampsYetText}</Text>
                <Text style={styles.noStampsHint}>{postToEarnStampText}</Text>
              </View>
            ) : (
              <View style={styles.stampsGrid}>
                {stamps.map((stamp, index) => {
                  const dateObj = new Date(stamp.stampDate);
                  const monthDay = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
                  return (
                    <View key={index} style={styles.stampItem}>
                      <IconSymbol
                        ios_icon_name="star.fill"
                        android_material_icon_name="star"
                        size={24}
                        color={colors.primary}
                      />
                      <Text style={styles.stampDate}>{monthDay}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.myPostsButton}
            onPress={() => router.push('/my-posts')}
          >
            <IconSymbol
              ios_icon_name="doc.text"
              android_material_icon_name="article"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.myPostsButtonText}>{t('myPosts')}</Text>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{aboutDIUText}</Text>
          <View style={styles.card}>
            <Text style={styles.cardText}>
              {aboutDIUContentText}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{guidelinesText}</Text>
          <View style={styles.card}>
            <View style={styles.guidelineItem}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.guidelineText}>{guidelineRespectText}</Text>
            </View>
            <View style={styles.guidelineItem}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.guidelineText}>{guidelineNoHateText}</Text>
            </View>
            <View style={styles.guidelineItem}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.guidelineText}>{guidelineAnonymousText}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={() => setShowLogoutModal(true)}
          >
            <IconSymbol
              ios_icon_name="arrow.right.square"
              android_material_icon_name="logout"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.logoutButtonText}>{signOutText}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Logout Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{signOutConfirmText}</Text>
            <Text style={styles.modalText}>
              {signOutMessageText}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowLogoutModal(false)}
                disabled={loggingOut}
              >
                <Text style={styles.modalButtonTextCancel}>{cancelText}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                <Text style={styles.modalButtonTextConfirm}>
                  {loggingOut ? signingOutText : signOutText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Username Modal */}
      <Modal
        visible={showUsernameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUsernameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{updateUsernameTitle}</Text>
            <Text style={styles.modalText}>
              {updateUsernameMessage}
            </Text>
            
            <TextInput
              style={styles.usernameInput}
              placeholder={usernamePlaceholderText}
              placeholderTextColor={colors.textSecondary}
              value={newUsername}
              onChangeText={(text) => {
                setNewUsername(text);
                setUsernameError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            
            <Text style={styles.usernameHint}>{usernameHintText}</Text>
            
            {usernameError ? (
              <Text style={styles.errorText}>{usernameError}</Text>
            ) : null}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowUsernameModal(false);
                  setNewUsername('');
                  setUsernameError('');
                }}
                disabled={updatingUsername}
              >
                <Text style={styles.modalButtonTextCancel}>{cancelText}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleUpdateUsername}
                disabled={updatingUsername}
              >
                {updatingUsername ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>
                    {updateUsernameText}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  editUsernameButton: {
    padding: 4,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  stampsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stampsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stampIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stampsTextContainer: {
    flex: 1,
  },
  stampsCount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  stampsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  noStampsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noStampsText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  noStampsHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stampsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stampItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    paddingVertical: 8,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stampDate: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  guidelineText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  myPostsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  myPostsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginLeft: 12,
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalButtonCancel: {
    backgroundColor: colors.backgroundAlt,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  unauthContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  unauthIconContainer: {
    marginBottom: 24,
  },
  unauthTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  unauthSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  signInButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  usernameInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  usernameHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
});
