
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
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
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  useEffect(() => {
    loadPostAndComments();
  }, [id]);

  const loadPostAndComments = async () => {
    console.log('PostDetail: Loading post and comments', { postId: id });
    setLoading(true);

    try {
      const { authenticatedGet } = await import('@/utils/api');
      
      // Load post details
      const postData = await authenticatedGet<Post>(`/api/posts/${id}`);
      console.log('PostDetail: Post loaded', postData);
      setPost(postData);

      // Load comments
      const commentsData = await authenticatedGet<Comment[]>(`/api/posts/${id}/comments`);
      console.log('PostDetail: Comments loaded', { count: commentsData.length });
      setComments(commentsData);
    } catch (error) {
      console.error('PostDetail: Error loading data', error);
      setPost(null);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    console.log('PostDetail: Like button pressed');
    
    // Optimistic update
    const previousState = { ...post };
    setPost({
      ...post,
      hasLiked: !post.hasLiked,
      likeCount: post.hasLiked ? post.likeCount - 1 : post.likeCount + 1,
    });

    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ liked: boolean; likeCount: number }>(
        `/api/posts/${id}/like`,
        {}
      );
      console.log('PostDetail: Like toggled successfully', response);
      
      // Update with actual server response
      setPost({
        ...post,
        hasLiked: response.liked,
        likeCount: response.likeCount,
      });
    } catch (error) {
      console.error('PostDetail: Error toggling like', error);
      // Revert on error
      setPost(previousState);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    console.log('PostDetail: Submit comment', { content: newComment });
    setSubmitting(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<Comment>(
        `/api/posts/${id}/comments`,
        { content: newComment.trim() }
      );
      
      console.log('PostDetail: Comment added successfully', response);
      setComments([...comments, response]);
      setNewComment('');
      
      if (post) {
        setPost({ ...post, commentCount: post.commentCount + 1 });
      }
    } catch (error) {
      console.error('PostDetail: Error adding comment', error);
      setErrorModal({ visible: true, message: 'Failed to add comment. Please try again.' });
    } finally {
      setSubmitting(false);
    }
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
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Post not found</Text>
      </View>
    );
  }

  const timeAgo = formatTimeAgo(post.createdAt);
  const likeIconName = post.hasLiked ? 'favorite' : 'favorite-border';

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Post',
          headerStyle: { backgroundColor: colors.backgroundAlt },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={item => item.id}
            ListHeaderComponent={
              <View style={styles.postSection}>
                <View style={styles.postCard}>
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
                </View>

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
              placeholder="Add a comment..."
              placeholderTextColor={colors.textSecondary}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={300}
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!newComment.trim() || submitting) && styles.sendButtonDisabled]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <IconSymbol
                  ios_icon_name="arrow.up"
                  android_material_icon_name="send"
                  size={20}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
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
    </>
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
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  keyboardView: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  postSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  postCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  commentCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 16,
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
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
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
