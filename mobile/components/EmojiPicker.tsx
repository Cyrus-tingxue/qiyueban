import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image, SafeAreaView } from 'react-native';
import { Colors } from '../constants/Colors';
import { Config } from '../constants/Config';
import { useLang } from '../contexts/LanguageContext';

const EMOJIS = [
  { name: '哦哟', file: '哦哟.jpg' }, { name: '哭哭', file: '哭哭.jpg' }, { name: '喜欢', file: '喜欢.png' },
  { name: '委屈屈', file: '委屈屈.png' }, { name: '帅气', file: '帅气.png' }, { name: '平静', file: '平静.png' },
  { name: '开心', file: '开心.jpg' }, { name: '惊恐', file: '惊恐.png' }, { name: '惊讶', file: '惊讶.png' },
  { name: '愤怒', file: '愤怒.png' }, { name: '无语', file: '无语.png' }, { name: '爱心', file: '爱心.png' },
  { name: '疑问', file: '疑问.jpg' }, { name: '小七-开心', file: '小七-开心.png' }, { name: '小七-沉默', file: '小七-沉默.png' },
  { name: '小七-悲伤', file: '小七-悲伤.png' }, { name: '小七-疑问', file: '小七-疑问.png' }, { name: '黄符-哭', file: '黄符-哭.png' },
  { name: '黄符-威胁', file: '黄符-威胁.png' }, { name: '黄符-抱抱', file: '黄符-抱抱.png' }, { name: '黄符-累趴', file: '黄符-累趴.png' },
  { name: '绝望的小蛋黄', file: '绝望的小蛋黄.jpg' }, { name: '酒哥儿-无奈', file: '酒哥儿-无奈.png' },
  { name: '酒哥儿-点赞', file: '酒哥儿-点赞.png' }, { name: '酒哥儿-送花', file: '酒哥儿-送花.png' }
];

interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (emojiTag: string) => void;
}

export default function EmojiPicker({ visible, onClose, onSelect }: EmojiPickerProps) {
  const { t } = useLang();

  const handleSelect = (file: string) => {
    onSelect(`[emoji:${file}]`);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.container} activeOpacity={1}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('emojiBtn')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={styles.grid}>
            {EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji.file}
                style={styles.emojiItem}
                onPress={() => handleSelect(emoji.file)}
              >
                <Image
                  source={{ uri: `${Config.EMOJI_BASE_URL}/${emoji.file}` }}
                  style={styles.emojiImage}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <SafeAreaView />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeText: {
    color: Colors.primary,
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  emojiItem: {
    width: '20%',
    aspectRatio: 1,
    padding: 8,
  },
  emojiImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});
