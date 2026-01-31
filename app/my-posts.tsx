
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Image, ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal } from '@/components/ui/Modal';
import { EditPostModal } from '@/components/ui/EditPostModal';

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface Post {
  id: string;
  content: string;
  fileUrl?: string;
  fileType?: 'image' | 'video';
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  authorUsername: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  hasLiked: boolean;
}

export default function MyPostsScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  const loadMyPosts = async () => {
    console.log('[MyPosts] Loading user posts');
    setLoading(true);
    
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const response = await authenticatedGet<Post[]>('/api/users/me/posts');
      console.log('[MyPosts] Posts loaded from API', { count: response.length });
      setPosts(response);
    } catch (error) {
      console.error('[MyPosts] Error loading posts', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    console.log('[MyPosts] Refreshing posts');
    setRefreshing(true);
    await loadMyPosts();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user) {
      loadMyPosts();
    }
  }, [user]);

  const handleLike = async (postId: string) => {
    console.log('[MyPosts] Like button pressed', { postId });

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
        console.log('[MyPosts] Post unliked successfully');
      } else {
        // Like the post
        await authenticatedPost(`/api/posts/${postId}/like`, {});
        console.log('[MyPosts] Post liked successfully');
      }
      
      // Reload posts to get accurate counts
      await loadMyPosts();
    } catch (error) {
      console.error('[MyPosts] Error toggling like', error);
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
    console.log('[MyPosts] Comment button pressed', { postId });
    router.push(`/post/${postId}`);
  };

  const handleEditPress = (post: Post) => {
    console.log('[MyPosts] Edit button pressed', { postId: post.id });
    setSelectedPost(post);
    setEditModalVisible(true);
  };

  const handleDeletePress = (post: Post) => {
    console.log('[MyPosts] Delete button pressed', { postId: post.id });
    setSelectedPost(post);
    setDeleteModalVisible(true);
  };

  const handleUpdatePost = async (postId: string, content: string) => {
    console.log('[MyPosts] Updating post', { postId, content });
    setActionLoading(true);

    try {
      const { authenticatedPut } = await import('@/utils/api');
      const updatedPost = await authenticatedPut<Post>(`/api/posts/${postId}`, {
        content,
      });
      console.log('[MyPosts] Post updated successfully', updatedPost);

      // Update the post in the list
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId ? { ...post, content: updatedPost.content } : post
        )
      );

      setEditModalVisible(false);
      setSelectedPost(null);
    } catch (error) {
      console.error('[MyPosts] Error updating post', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;

    console.log('[MyPosts] Deleting post', { postId: selectedPost.id });
    setActionLoading(true);

    try {
      const { authenticatedDelete } = await import('@/utils/api');
      await authenticatedDelete(`/api/posts/${selectedPost.id}`);
      console.log('[MyPosts] Post deleted successfully');

      // Remove the post from the list
      setPosts(prevPosts => prevPosts.filter(post => post.id !== selectedPost.id));

      setDeleteModalVisible(false);
      setSelectedPost(null);
    } catch (error) {
      console.error('[MyPosts] Error deleting post', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
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

  const renderPost = ({ item }: { item: Post }) => {
    const timeAgo = formatTimeAgo(item.createdAt);
    const likeIconName = item.hasLiked ? 'favorite' : 'favorite-border';
    const mediaUrl = item.mediaUrl || item.fileUrl;
    const mediaType = item.mediaType || item.fileType;
    
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Text style={styles.username}>@{item.authorUsername}</Text>
          <View style={styles.postHeaderRight}>
            <Text style={styles.timestamp}>{timeAgo}</Text>
            <View style={styles.postMenuButtons}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => handleEditPress(item)}
              >
                <IconSymbol
                  ios_icon_name="pencil"
                  android_material_icon_name="edit"
                  size={18}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => handleDeletePress(item)}
              >
                <IconSymbol
                  ios_icon_name="trash"
                  android_material_icon_name="delete"
                  size={18}
                  color="#FF3B30"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {item.content ? (
          <Text style={styles.postContent}>{item.content}</Text>
        ) : null}

        {mediaUrl && mediaType === 'image' ? (
          <Image
            source={resolveImageSource(mediaUrl)}
            style={styles.mediaImage}
            resizeMode="contain"
          />
        ) : null}

        {mediaUrl && mediaType === 'video' ? (
          <Video
            source={{ uri: mediaUrl }}
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
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen 
          options={{ 
            title: t('myPosts'),
            headerShown: true,
            headerBackVisible: true,
            headerBackTitle: 'Back',
          }} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('loadingPosts')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{ 
          title: t('myPosts'),
          headerShown: true,
          headerBackVisible: true,
          headerBackTitle: 'Back',
        }} 
      />

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
            <IconSymbol
              ios_icon_name="doc.text"
              android_material_icon_name="article"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>{t('noMyPosts')}</Text>
            <Text style={styles.emptySubtext}>{t('noMyPostsMessage')}</Text>
            <TouchableOpacity
              style={styles.createPostButton}
              onPress={() => router.push('/create-post')}
            >
              <Text style={styles.createPostButtonText}>{t('createPost')}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        title={t('deletePostConfirm')}
        message={t('deletePostMessage')}
        confirmText={actionLoading ? t('deleting') : t('delete')}
        cancelText={t('cancel')}
        onConfirm={handleDeletePost}
        confirmDestructive
        showCancel
      />

      {/* Edit Post Modal */}
      {selectedPost && (
        <EditPostModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          postId={selectedPost.id}
          initialContent={selectedPost.content}
          onUpdate={handleUpdatePost}
        />
      )}
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
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
  postHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postMenuButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  menuButton: {
    padding: 4,
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
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  createPostButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  createPostButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
