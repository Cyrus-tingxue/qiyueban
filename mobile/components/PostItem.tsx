import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import AvatarIcon from './AvatarIcon';
import { Config } from '../constants/Config';

interface PostItemProps {
  post: any;
  onPress: () => void;
}

function PostItem({ post, onPress }: PostItemProps) {
  const categoryColor = Colors.categoryColors[post.category] || Colors.primary;
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.substring(0, 16);
  };

  let imageUrl = post.image_url;
  if (imageUrl && imageUrl.startsWith('/api/')) {
    imageUrl = `${Config.API_BASE_URL.replace('/api', '')}${imageUrl}`;
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.leftCol}>
        <AvatarIcon type={post.author_avatar || 'eye'} size={40} isAnimating={false} />
      </View>
      
      <View style={styles.rightCol}>
        <Text style={styles.title} numberOfLines={2}>
          {post.is_grave && <Text style={styles.graveText}>坟 </Text>}
          {post.category && <Text style={styles.categoryText}>【{post.category}】 </Text>}
          <Text style={styles.titleText}>{post.title}</Text>
        </Text>

        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{post.author || '匿名'}</Text>
          <Text style={styles.footerText}>{formatDate(post.created_at)}</Text>
          <Text style={styles.footerText}>{post.reply_count || 0}回复</Text>
          <Text style={styles.footerText}>{post.like_count || 0}赞</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#0a0e14', // Very dark background
    borderWidth: 1,
    borderColor: '#331515',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginVertical: 4,
    marginHorizontal: 16,
    padding: 12,
  },
  leftCol: {
    marginRight: 12,
    justifyContent: 'center',
  },
  rightCol: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  titleText: {
    color: '#e0d8d0',
  },
  categoryText: {
    color: Colors.primaryLight,
    fontWeight: 'bold',
  },
  graveText: {
    color: '#888',
    fontSize: 14,
  },
  thumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 12,
  },
});

export default memo(PostItem);
