
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet } from '@/utils/api';

interface Interaction {
  id: string;
  type: 'like' | 'comment';
  interactorUserId: string;
  interactorUsername: string;
  postId: string;
  postContent: string;
  commentContent?: string;
  createdAt: string;
}

export default function InteractionsScreen() {
  console.log('InteractionsScreen: Rendering');
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    console.log('InteractionsScreen: useEffect triggered', { hasUser: !!user });
    if (user) {
      loadInteractions();
    } else {
      setLoading(false);
      setShowAuthModal(true);
    }
  }, [user]);

  const loadInteractions = async () => {
    console.log('InteractionsScreen: Loading interactions');
    try {
      setLoading(true);
      const data = await authenticatedGet<Interaction[]>('/api/users/interactions');
      console.log('InteractionsScreen: Loaded interactions', { count: data.length });
      setInteractions(data);
    } catch (error) {
      console.error('InteractionsScreen: Failed to load interactions', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('InteractionsScreen: User triggered refresh');
    setRefreshing(true);
    loadInteractions();
  };

  const handleViewPost = (postId: string) => {
    console.log('InteractionsScreen: Navigating to post', { postId });
    router.push(`/post/${postId}`);
  };

  const handleGoToAuth = () => {
    console.log('InteractionsScreen: Navigating to auth screen');
    setShowAuthModal(false);
    router.push('/auth');
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return t('justNow');
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      const minuteText = diffInMinutes === 1 ? t('minuteAgo') : t('minutesAgo');
      return `${diffInMinutes} ${minuteText}`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      const hourText = diffInHours === 1 ? t('hourAgo') : t('hoursAgo');
      return `${diffInHours} ${hourText}`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    const dayText = diffInDays === 1 ? t('dayAgo') : t('daysAgo');
    return `${diffInDays} ${dayText}`;
  };

  const renderInteraction = ({ item }: { item: Interaction }) => {
    const isLike = item.type === 'like';
    const actionText = isLike ? t('likedYourPost') : t('commentedOnYourPost');
    const timeAgoText = formatTimeAgo(item.createdAt);

    return (
      <TouchableOpacity
        style={styles.interactionCard}
        onPress={() => handleViewPost(item.postId)}
        activeOpacity={0.7}
      >
        <View style={styles.interactionHeader}>
          <View style={styles.iconContainer}>
            <IconSymbol
              ios_icon_name={isLike ? 'heart.fill' : 'bubble.left.fill'}
              android_material_icon_name={isLike ? 'favorite' : 'chat'}
              size={24}
              color={isLike ? colors.primary : colors.accent}
            />
          </View>
          <View style={styles.interactionContent}>
            <View style={styles.interactionTextRow}>
              <Text style={styles.username}>{item.interactorUsername}</Text>
              <Text style={styles.actionText}> {actionText}</Text>
            </View>
            <Text style={styles.postPreview} numberOfLines={2}>
              {item.postContent}
            </Text>
            {!isLike && item.commentContent && (
              <View style={styles.commentBox}>
                <Text style={styles.commentText} numberOfLines={3}>
                  {item.commentContent}
                </Text>
              </View>
            )}
            <View style={styles.interactionFooter}>
              <Text style={styles.timeText}>{timeAgoText}</Text>
              <Text style={styles.viewPostText}>{t('viewPost')}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <>
        <SafeAreaView style={commonStyles.container} edges={['top']}>
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="bell.fill"
              android_material_icon_name="notifications"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>{t('signInToViewInteractions')}</Text>
            <Text style={styles.emptyMessage}>{t('signInInteractionsMessage')}</Text>
            <TouchableOpacity style={styles.signInButton} onPress={handleGoToAuth}>
              <Text style={styles.signInButtonText}>{t('signIn')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <Modal
          visible={showAuthModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAuthModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <IconSymbol
                ios_icon_name="bell.fill"
                android_material_icon_name="notifications"
                size={48}
                color={colors.primary}
              />
              <Text style={styles.modalTitle}>{t('signInToViewInteractions')}</Text>
              <Text style={styles.modalMessage}>{t('signInInteractionsMessage')}</Text>
              <TouchableOpacity style={styles.modalButton} onPress={handleGoToAuth}>
                <Text style={styles.modalButtonText}>{t('signIn')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAuthModal(false);
                  router.back();
                }}
              >
                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={commonStyles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (interactions.length === 0) {
    return (
      <SafeAreaView style={commonStyles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="bell.fill"
            android_material_icon_name="notifications"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>{t('noInteractions')}</Text>
          <Text style={styles.emptyMessage}>{t('noInteractionsMessage')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      <FlatList
        data={interactions}
        renderItem={renderInteraction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  signInButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  signInButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  interactionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  interactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  interactionContent: {
    flex: 1,
  },
  interactionTextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  postPreview: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentBox: {
    backgroundColor: colors.backgroundAlt,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  commentText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  interactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  viewPostText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    paddingVertical: 12,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
});
