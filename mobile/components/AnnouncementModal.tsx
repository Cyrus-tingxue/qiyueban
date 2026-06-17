import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../constants/Colors';
import { announcementService } from '../services/announcementService';
import { storage } from '../utils/storage';
import { useLang } from '../contexts/LanguageContext';

export default function AnnouncementModal() {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState('');

  useEffect(() => {
    const checkAnnouncement = async () => {
      try {
        const data = await announcementService.getAnnouncement();
        if (data && data.content && data.content.trim() !== '') {
          const dismissedContent = await storage.getDismissedAnnouncement();
          if (dismissedContent === data.content) return; // Don't show if this exact content was dismissed

          setContent(data.content);
          setVisible(true);
        }
      } catch (e) {
        console.warn('Failed to load announcement:', e);
      }
    };
    
    checkAnnouncement();
  }, []);

  const handleDismiss = async () => {
    await storage.setDismissedAnnouncement(content);
    setVisible(false);
  };

  const handleClose = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>网站公告</Text>
          
          <ScrollView style={styles.contentScroll}>
            <Text style={styles.content}>{content}</Text>
          </ScrollView>
          
          <View style={{flexDirection: 'row', gap: 12, marginTop: 10}}>
            <TouchableOpacity style={[styles.button, {flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border}]} onPress={handleClose}>
              <Text style={[styles.buttonText, {color: Colors.text}]}>关闭</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, {flex: 1}]} onPress={handleDismiss}>
              <Text style={styles.buttonText}>不再提醒</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  contentScroll: {
    marginBottom: 20,
  },
  content: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
