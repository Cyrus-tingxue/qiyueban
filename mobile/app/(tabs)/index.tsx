import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useLang } from '../../contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import PostList from '../../components/PostList';

const CATEGORIES = [
  { key: 'all', title: '最新', params: { category: null, sort: 'newest' } },
  { key: 'featured', title: '精品', params: { category: null, sort: 'likes' } },
  { key: 'live', title: '语c', params: { category: '语c', sort: 'newest' } },
  { key: 'oc', title: 'OC', params: { category: 'OC投稿', sort: 'newest' } },
];

export default function HomeScreen() {
  const { t } = useLang();
  const layout = useWindowDimensions();
  
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const [index, setIndex] = useState(0);
  const [routes] = useState(CATEGORIES);

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>柒月半</Text>
        <TouchableOpacity onPress={() => setSearchOpen(!searchOpen)}>
          <Ionicons name="search" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {searchOpen && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={Colors.textMuted}
            value={searchInput}
            onChangeText={setSearchInput}
            autoFocus
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchInput(''); setSearch(''); }} style={{marginRight: 8}}>
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSearch} style={{paddingHorizontal: 8, paddingVertical: 4}}>
            <Text style={{color: Colors.primary, fontWeight: 'bold'}}>搜索</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderScene = ({ route }: any) => {
    return (
      <PostList 
        category={route.params.category} 
        sort={route.params.sort} 
        search={search} 
      />
    );
  };

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      scrollEnabled
      indicatorStyle={{ backgroundColor: Colors.primary }}
      style={{ backgroundColor: Colors.background, elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: Colors.border }}
      tabStyle={{ width: 'auto', paddingHorizontal: 16 }}
      renderLabel={({ route, focused }) => (
        <Text style={{ 
          color: focused ? Colors.textOnPrimary : Colors.textSecondary,
          fontWeight: 'bold',
          backgroundColor: focused ? Colors.primary : Colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 6,
          borderRadius: 20,
          overflow: 'hidden'
        }}>
          {route.title}
        </Text>
      )}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {renderHeader()}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: Colors.primary,
    letterSpacing: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: Colors.text,
  },
});
