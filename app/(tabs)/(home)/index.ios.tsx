
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';

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
  const router = useRouter();
  const { user } = useAuth();

  const loadPosts = async () => {
    console.log('HomeScreen: Loading posts');
    setLoading(true);
    
    // TODO: Backend Integration - GET /api/posts to fetch all posts
    // Mock data for now
    setTimeout(() => {
      const mockPosts: Post[] = [
        {
          id: '1',
          content: 'Just needed to get this off my chest... work has been so frustrating lately!',
          authorUsername: 'anonymous_user',
          createdAt: new Date().toISOString(),
          likeCount: 12,
          commentCount: 3,
          hasLiked: false,
        },
        {
          id: '2',
          content: 'Why do people not use turn signals?! It drives me crazy!',
          authorUsername: 'venting_person',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          likeCount: 45,
          commentCount: 8,
          hasLiked: true,
        },
      ];
      setPosts(mockPosts);
      setLoading(false);
      console.log('HomeScreen: Posts loaded', { count: mockPosts.length });
    }, 1000);
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
    console.log('HomeScreen: Like button pressed', { postId });
    // TODO: Backend Integration - POST /api/posts/:id/like to toggle like
    
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
  };

  const handleComment = (postId: string) => {
    console.log('HomeScreen: Comment button pressed', { postId });
    router.push(`/post/${postId}`);
  };

  const handleCreatePost = () => {
    console.log('HomeScreen: Create post button pressed');
    router.push('/create-post');
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

  const renderPost = ({ item }: { item: Post }) => {
    const timeAgo = formatTimeAgo(item.createdAt);
    
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Text style={styles.username}>@{item.authorUsername}</Text>
          <Text style={styles.timestamp}>{timeAgo}</Text>
        </View>

        <Text style={styles.postContent}>{item.content}</Text>

        <View style={styles.postActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <IconSymbol
              ios_icon_name={item.hasLiked ? 'heart.fill' : 'heart'}
              android_material_icon_name={item.hasLiked ? 'favorite' : 'favorite-border'}
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DIU</Text>
        <Text style={styles.headerSubtitle}>Vent Anonymously</Text>
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
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Be the first to vent!</Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
});
