
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, Image, ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface Post {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  authorUsername: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  hasLiked: boolean;
}

export default function HomeScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState<'like' | 'comment' | 'post'>('like');
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  const loadPosts = async () => {
    console.log('HomeScreen: Loading posts (public endpoint)');
    setLoading(true);
    
    try {
      const { apiGet } = await import('@/utils/api');
      const response = await apiGet<Post[]>('/api/posts');
      console.log('HomeScreen: Posts loaded from API', { 
        count: response.length,
        note: 'Backend generates fresh signed URLs on every fetch - media never expires!'
      });
      setPosts(response);
    } catch (error) {
      console.error('HomeScreen: Error loading posts', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    console.log('HomeScreen: Refreshing posts');
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleLike = async (postId: string) => {
    console.log('HomeScreen: Like button pressed', { postId, authenticated: !!user });
    
    // Check authentication
    if (!user) {
      console.log('HomeScreen: User not authenticated, showing auth modal');
      setAuthAction('like');
      setShowAuthModal(true);
      return;
    }

    // Get current like state for this post
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const wasLiked = post.hasLiked;

    // Optimistic update
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? {
              ...post,
              hasLiked: !post.hasLiked,
              likeCount: post.hasLiked ? post.likeCount - 1 : post.likeCount + 1,
            }
          : post
      )
    );

    try {
      const { authenticatedPost, authenticatedDelete } = await import('@/utils/api');
      
      if (wasLiked) {
        // Unlike the post
        await authenticatedDelete(`/api/posts/${postId}/like`, {});
        console.log('HomeScreen: Post unliked successfully');
      } else {
        // Like the post
        await authenticatedPost(`/api/posts/${postId}/like`, {});
        console.log('HomeScreen: Post liked successfully');
      }
      
      // Reload posts to get accurate counts
      await loadPosts();
    } catch (error) {
      console.error('HomeScreen: Error toggling like', error);
      // Revert optimistic update on error
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                hasLiked: wasLiked,
                likeCount: wasLiked ? post.likeCount + 1 : post.likeCount - 1,
              }
            : post
        )
      );
    }
  };

  const handleComment = (postId: string) => {
    console.log('HomeScreen: Comment button pressed', { postId, authenticated: !!user });
    
    // Check authentication
    if (!user) {
      console.log('HomeScreen: User not authenticated, showing auth modal');
      setAuthAction('comment');
      setShowAuthModal(true);
      return;
    }

    router.push(`/post/${postId}`);
  };

  const handleCreatePost = () => {
    console.log('HomeScreen: Create post button pressed', { authenticated: !!user });
    
    // Check authentication
    if (!user) {
      console.log('HomeScreen: User not authenticated, showing auth modal');
      setAuthAction('post');
      setShowAuthModal(true);
      return;
    }

    router.push('/create-post');
  };

  const handleAuthModalClose = () => {
    setShowAuthModal(false);
  };

  const handleGoToAuth = () => {
    setShowAuthModal(false);
    router.push('/auth');
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return t('justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      const minuteText = minutes === 1 ? t('minuteAgo') : t('minutesAgo');
      return `${minutes} ${minuteText}`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      const hourText = hours === 1 ? t('hourAgo') : t('hoursAgo');
      return `${hours} ${hourText}`;
    }
    const days = Math.floor(hours / 24);
    const dayText = days === 1 ? t('dayAgo') : t('daysAgo');
    return `${days} ${dayText}`;
  };

  const getAuthMessage = () => {
    if (authAction === 'like') return t('signInToLike');
    if (authAction === 'comment') return t('signInToComment');
    return t('signInToPost');
  };

  const renderPost = ({ item }: { item: Post }) => {
    const timeAgo = formatTimeAgo(item.createdAt);
    const likeIconName = item.hasLiked ? 'favorite' : 'favorite-border';
    
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Text style={styles.username}>@{item.authorUsername}</Text>
          <Text style={styles.timestamp}>{timeAgo}</Text>
        </View>

        {item.content ? (
          <Text style={styles.postContent}>{item.content}</Text>
        ) : null}

        {item.mediaUrl && item.mediaType === 'image' ? (
          <Image
            source={resolveImageSource(item.mediaUrl)}
            style={styles.mediaImage}
            resizeMode="contain"
          />
        ) : null}

        {item.mediaUrl && item.mediaType === 'video' ? (
          <Video
            source={{ uri: item.mediaUrl }}
            style={styles.mediaVideo}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
          />
        ) : null}

        <View style={styles.postActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <IconSymbol
              ios_icon_name={item.hasLiked ? 'heart.fill' : 'heart'}
              android_material_icon_name={likeIconName}
              size={20}
              color={item.hasLiked ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.actionText, item.hasLiked && styles.actionTextActive]}>
              {item.likeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleComment(item.id)}
          >
            <IconSymbol
              ios_icon_name="bubble.left"
              android_material_icon_name="chat-bubble-outline"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={styles.actionText}>{item.commentCount}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const appNameText = t('appName');
  const appSubtitleText = t('appSubtitle');
  const noPostsText = t('noPosts');
  const beFirstToVentText = t('beFirstToVent');
  const authMessageText = getAuthMessage();
  const createAccountMessageText = t('createAccountMessage');
  const signInText = t('signIn');
  const cancelText = t('cancel');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{appNameText}</Text>
          <Text style={styles.headerSubtitle}>{appSubtitleText}</Text>
        </View>
        <LanguageSwitcher />
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{noPostsText}</Text>
            <Text style={styles.emptySubtext}>{beFirstToVentText}</Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={handleCreatePost}
      >
        <IconSymbol
          ios_icon_name="plus"
          android_material_icon_name="add"
          size={28}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      {/* Auth Required Modal */}
      <Modal
        visible={showAuthModal}
        transparent
        animationType="fade"
        onRequestClose={handleAuthModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{authMessageText}</Text>
            <Text style={styles.modalMessage}>
              {createAccountMessageText}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonPrimary}
                onPress={handleGoToAuth}
              >
                <Text style={styles.modalButtonTextPrimary}>{signInText}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonSecondary}
                onPress={handleAuthModalClose}
              >
                <Text style={styles.modalButtonTextSecondary}>{cancelText}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  postContent: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  mediaImage: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 400,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: colors.background,
  },
  mediaVideo: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 400,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: colors.background,
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  actionTextActive: {
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  modalButtons: {
    gap: 12,
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonTextSecondary: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
