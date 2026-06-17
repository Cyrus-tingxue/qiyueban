import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';
import { useEffect, useState } from 'react';
import { postService } from '../../services/postService';
import { messageService } from '../../services/messageService';
import { getMutedGroupIds } from '../../utils/groupMute';
import { eventBus, Events } from '../../utils/events';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const { t } = useLang();
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();
  
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadMsg(0);
      setUnreadNotif(0);
      return;
    }

    const fetchUnread = async () => {
      try {
        const [notifData, convs, groups, invites] = await Promise.all([
          postService.getUnreadNotificationsCount(),
          messageService.getConversations(),
          messageService.getGroups(),
          messageService.getGroupInvites(),
        ]);

        const mutedIds = new Set(await getMutedGroupIds());
        
        const privateUnread = convs.reduce((s: number, i: any) => s + (i.unread_count || 0), 0);
        const groupUnread = groups.reduce((s: number, i: any) => mutedIds.has(i.id) ? s : s + (i.unread_count || 0), 0);
        
        setUnreadMsg(privateUnread + groupUnread + invites.length);
        setUnreadNotif(notifData.unread_count || 0);
      } catch (e) {
        // fail silently
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 3000);

    const handleEvent = () => fetchUnread();
    eventBus.on(Events.MESSAGE_DATA_CHANGED, handleEvent);
    eventBus.on(Events.MESSAGE_UNREAD_STATE_CHANGED, handleEvent);
    eventBus.on(Events.NOTIFICATION_READ, handleEvent);
    eventBus.on(Events.GROUP_MUTE_CHANGED, handleEvent);

    return () => {
      clearInterval(interval);
      eventBus.off(Events.MESSAGE_DATA_CHANGED, handleEvent);
      eventBus.off(Events.MESSAGE_UNREAD_STATE_CHANGED, handleEvent);
      eventBus.off(Events.NOTIFICATION_READ, handleEvent);
      eventBus.off(Events.GROUP_MUTE_CHANGED, handleEvent);
    };
  }, [isLoggedIn]);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          tabBarStyle: { backgroundColor: Colors.background, borderTopColor: Colors.border },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('navLatest'),
            tabBarIcon: ({ color }) => <Ionicons name="newspaper-outline" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: t('navChat'),
            tabBarIcon: ({ color }) => <Ionicons name="chatbubbles-outline" size={24} color={color} />,
            tabBarBadge: unreadMsg > 0 ? unreadMsg : undefined,
          }}
        />
        <Tabs.Screen
          name="my"
          options={{
            title: t('navMy'),
            tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
            tabBarBadge: unreadNotif > 0 ? unreadNotif : undefined,
          }}
        />
      </Tabs>
      
      {/* Floating Action Button for Create Post */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          if (!isLoggedIn) {
            router.push('/login');
          } else {
            router.push('/post/create');
          }
        }}
      >
        <Text style={styles.fabText}>发帖</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#a12121', // Darker red based on image
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fabText: {
    color: '#e0d8d0',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
