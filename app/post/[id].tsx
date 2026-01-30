
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/button';

interface Post {
  id: string;
  content: string;
  authorUsername: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  hasLiked: boolean;
}

interface Comment {
  id: string;
  content: string;
  authorUsername: string;
  createdAt: string;
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const loadPostAndComments = async () => {
    console.log('PostDetailScreen: Loading post and comments', { postId: id });
    setLoading(true);

    try {
      const { apiGet } = await import('@/utils/api');
      
      // Load post details (public endpoint)
      const postData = await apiGet<Post>(`/api/posts/${id}`);
      console.log('PostDetailScreen: Post loaded', postData);
      setPost(postData);

      // Load comments (public endpoint)
      const commentsData = await apiGet<Comment[]>(`/api/posts/${id}/comments`);
      console.log('PostDetailScreen: Comments loaded', { count: commentsData.length });
      setComments(commentsData);
    } catch (error) {
      console.error('PostDetailScreen: Error loading data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadPostAndComments();
    }
  }, [id]);

  const handleLike = async () => {
    console.log('PostDetailScreen: Like button pressed', { authenticated: !!user });
    
    if (!user) {
      console.log('PostDetailScreen: User not authenticated, showing auth modal');
      setShowAuthModal(true);
      return;
    }

    if (!post) return;

    // Optimistic update
    setPost(prev => prev ? {
      ...prev,
      hasLiked: !prev.hasLiked,
      likeCount: prev.hasLiked ? prev.likeCount - 1 : prev.likeCount + 1,
    } : null);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ liked: boolean; likeCount: number }>(
        `/api/posts/${id}/like`,
        {}
      );
      console.log('PostDetailScreen: Like toggled successfully', response);
      
      setPost(prev => prev ? {
        ...prev,
        hasLiked: response.liked,
        likeCount: response.likeCount,
      } : null);
    } catch (error) {
      console.error('PostDetailScreen: Error toggling like', error);
      // Revert on error
      setPost(prev => prev ? {
        ...prev,
        hasLiked: !prev.hasLiked,
        likeCount: prev.hasLiked ? prev.likeCount + 1 : prev.likeCount - 1,
      } : null);
    }
  };

  const handleSubmitComment = async () => {
    console.log('PostDetailScreen: Submit comment pressed', { authenticated: !!user });
    
    if (!user) {
      console.log('PostDetailScreen: User not authenticated, showing auth modal');
      setShowAuthModal(true);
      return;
    }

    const trimmedComment = commentText.trim();
    if (!trimmedComment) {
      console.log('PostDetailScreen: Empty comment, ignoring');
      return;
    }

    console.log('PostDetailScreen: Submitting comment', { content: trimmedComment });
    setSubmitting(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      const newComment = await authenticatedPost<Comment>(
        `/api/posts/${id}/comments`,
        { content: trimmedComment }
      );
      
      console.log('PostDetailScreen: Comment submitted successfully', newComment);
      setComments(prev => [newComment, ...prev]);
      setCommentText('');
      
      // Update comment count
      setPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);
    } catch (error) {
      console.error('PostDetailScreen: Error submitting comment', error);
    } finally {
      setSubmitting(false);
    }
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

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      const minuteText = minutes === 1 ? 'minute' : 'minutes';
      return `${minutes} ${minuteText} ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      const hourText = hours === 1 ? 'hour' : 'hours';
      return `${hours} ${hourText} ago`;
    }
    const days = Math.floor(hours / 24);
    const dayText = days === 1 ? 'day' : 'days';
    return `${days} ${dayText} ago`;
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const timeAgo = formatTimeAgo(item.createdAt);
    
    return (
      <View style={styles.commentCard}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>@{item.authorUsername}</Text>
          <Text style={styles.commentTimestamp}>{timeAgo}</Text>
        </View>
        <Text style={styles.commentContent}>{item.content}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Post not found</Text>
      </View>
    );
  }

  const timeAgo = formatTimeAgo(post.createdAt);
  const likeIconName = post.hasLiked ? 'favorite' : 'favorite-border';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Post' }} />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            <View style={styles.postSection}>
              <View style={styles.postHeader}>
                <Text style={styles.username}>@{post.authorUsername}</Text>
                <Text style={styles.timestamp}>{timeAgo}</Text>
              </View>

              <Text style={styles.postContent}>{post.content}</Text>

              <View style={styles.postActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleLike}
                >
                  <IconSymbol
                    ios_icon_name={post.hasLiked ? 'heart.fill' : 'heart'}
                    android_material_icon_name={likeIconName}
                    size={20}
                    color={post.hasLiked ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.actionText, post.hasLiked && styles.actionTextActive]}>
                    {post.likeCount}
                  </Text>
                </TouchableOpacity>

                <View style={styles.actionButton}>
                  <IconSymbol
                    ios_icon_name="bubble.left"
                    android_material_icon_name="chat-bubble-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.actionText}>{post.commentCount}</Text>
                </View>
              </View>

              <View style={styles.divider} />
              <Text style={styles.commentsTitle}>Comments</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Be the first to comment!</Text>
            </View>
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={user ? "Add a comment..." : "Sign in to comment"}
            placeholderTextColor={colors.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            editable={!!user}
            onFocus={() => {
              if (!user) {
                setShowAuthModal(true);
              }
            }}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <IconSymbol
                ios_icon_name="paperplane.fill"
                android_material_icon_name="send"
                size={20}
                color="#FFFFFF"
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Auth Required Modal */}
      <Modal
        visible={showAuthModal}
        transparent
        animationType="fade"
        onRequestClose={handleAuthModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sign in to comment</Text>
            <Text style={styles.modalMessage}>
              Create an account or sign in to join the conversation
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonPrimary}
                onPress={handleGoToAuth}
              >
                <Text style={styles.modalButtonTextPrimary}>Sign In</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonSecondary}
                onPress={handleAuthModalClose}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContent: {
    paddingBottom: 20,
  },
  postSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 16,
    marginBottom: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  commentCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  commentTimestamp: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  commentContent: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
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
