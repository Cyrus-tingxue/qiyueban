import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Config } from '../constants/Config';
import { Colors } from '../constants/Colors';

interface RichContentProps {
  text: string;
}

export default function RichContent({ text }: RichContentProps) {
  const parsedContent = useMemo(() => {
    if (!text) return [];
    
    // First, split by large images so they don't get wrapped in <Text>
    const blocks = text.split(/(\[img:[^\]]+\])/g);
    
    return blocks.map((block, bIndex) => {
      const imgMatch = block.match(/^\[img:(.+)\]$/);
      if (imgMatch) {
        let url = imgMatch[1];
        if (url.startsWith('/api/')) {
          url = `${Config.API_BASE_URL.replace('/api', '')}${url}`;
        }
        return (
          <Image
            key={`img-${bIndex}`}
            source={{ uri: url }}
            style={styles.attachedImage}
            resizeMode="contain"
          />
        );
      }
      
      // For non-image blocks, parse emojis and urls inside a single Text wrapper
      if (block) {
        const inlineParts = block.split(/(\[emoji:[^\]]+\])/g);
        
        return (
          <Text key={`text-block-${bIndex}`} style={styles.textContainer}>
            {inlineParts.map((part, pIndex) => {
              const emojiMatch = part.match(/^\[emoji:(.+)\]$/);
              if (emojiMatch) {
                const filename = emojiMatch[1];
                return (
                  <Image
                    key={`emoji-${bIndex}-${pIndex}`}
                    source={{ uri: `${Config.EMOJI_BASE_URL}/${filename}` }}
                    style={styles.emoji}
                    resizeMode="contain"
                  />
                );
              }
              
              if (part) {
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const textParts = part.split(urlRegex);
                return textParts.map((tPart, tIndex) => {
                  if (tPart.match(urlRegex)) {
                    return (
                      <Text
                        key={`url-${bIndex}-${pIndex}-${tIndex}`}
                        style={styles.link}
                        onPress={() => Linking.openURL(tPart)}
                      >
                        {tPart}
                      </Text>
                    );
                  }
                  return <Text style={styles.text} key={`plain-${bIndex}-${pIndex}-${tIndex}`}>{tPart}</Text>;
                });
              }
              return null;
            })}
          </Text>
        );
      }
      
      return null;
    }).filter(Boolean);
  }, [text]);

  return (
    <View style={styles.container}>
      {parsedContent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  textContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  text: {
    fontSize: 16,
    color: Colors.text,
  },
  link: {
    color: Colors.info,
    textDecorationLine: 'underline',
  },
  emoji: {
    width: 48,
    height: 48,
    marginHorizontal: 4,
    alignSelf: 'center',
  },
  attachedImage: {
    width: '100%',
    aspectRatio: 0.75,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});
