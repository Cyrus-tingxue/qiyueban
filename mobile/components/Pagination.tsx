import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, page <= 1 && styles.buttonDisabled]}
        disabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
      >
        <Ionicons name="chevron-back" size={20} color={page <= 1 ? Colors.textMuted : Colors.primary} />
      </TouchableOpacity>
      
      <Text style={styles.text}>{page} / {totalPages}</Text>
      
      <TouchableOpacity
        style={[styles.button, page >= totalPages && styles.buttonDisabled]}
        disabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
      >
        <Ionicons name="chevron-forward" size={20} color={page >= totalPages ? Colors.textMuted : Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  button: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  buttonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
