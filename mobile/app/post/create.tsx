import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useLang } from '../../contexts/LanguageContext';
import { postService } from '../../services/postService';
import { useAuth } from '../../contexts/AuthContext';
import EmojiPicker from '../../components/EmojiPicker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function CreatePostScreen() {
  const router = useRouter();
  const { t } = useLang();
  const { isLoggedIn } = useAuth();
  
  const [categories, setCategories] = useState<{name: string}[]>([]);
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      Alert.alert('Notice', t('postFailed'), [{ text: 'OK', onPress: () => router.back() }]);
      return;
    }
    fetchCategories();
  }, [isLoggedIn]);

  const fetchCategories = async () => {
    try {
      const data = await postService.getCategories();
      setCategories(data);
      if (data.length > 0) setCategory(data[0].name);
    } catch (e) {
      console.warn(e);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim() || !category) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    
    setSubmitting(true);
    try {
      const newPost = await postService.createPost({ title, content, category });
      router.replace(`/post/${newPost.id}`);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || t('postFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSubmitting(true);
      try {
        const uploadRes = await postService.uploadImage(result.assets[0].uri);
        setContent(prev => prev + `\n[img:${uploadRes.url}]`);
      } catch (e) {
        Alert.alert('Error', t('uploadFailed'));
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <ScrollView style={styles.scrollView}>
          <Text style={styles.label}>{t('category')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.name}
                style={[styles.catChip, category === c.name && styles.catChipActive]}
                onPress={() => setCategory(c.name)}
              >
                <Text style={[styles.catText, category === c.name && styles.catTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>{t('title')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('titlePlaceholder')}
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>{t('content')}</Text>
          <TextInput
            style={[styles.input, styles.contentInput]}
            placeholder={t('contentPlaceholder')}
            placeholderTextColor={Colors.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
        
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setShowEmojiPicker(true)}>
            <Ionicons name="happy-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.toolText}>{t('emojiBtn')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={pickImage}>
            <Ionicons name="image-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.toolText}>{t('imageBtn')}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.publishBtn} onPress={handlePublish} disabled={submitting}>
            {submitting ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.publishText}>{t('publish')}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <EmojiPicker 
        visible={showEmojiPicker} 
        onClose={() => setShowEmojiPicker(false)} 
        onSelect={(emoji) => setContent(prev => prev + emoji)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1, padding: 16 },
  label: { color: Colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 16 },
  catScroll: { flexDirection: 'row', marginBottom: 16 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, marginRight: 8 },
  catChipActive: { backgroundColor: Colors.primary },
  catText: { color: Colors.textSecondary, fontWeight: 'bold' },
  catTextActive: { color: Colors.textOnPrimary },
  input: { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 8, padding: 12, color: Colors.text, fontSize: 16 },
  contentInput: { minHeight: 200 },
  toolbar: { flexDirection: 'row', padding: 12, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, alignItems: 'center' },
  toolBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 4 },
  toolText: { color: Colors.textSecondary, fontSize: 14 },
  publishBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  publishText: { color: Colors.textOnPrimary, fontWeight: 'bold', fontSize: 16 },
});
