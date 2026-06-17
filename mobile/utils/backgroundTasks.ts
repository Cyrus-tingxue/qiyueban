import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import { messageService } from '../services/messageService';
import { storage } from './storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_FETCH_TASK = 'background-fetch-messages';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const token = await storage.getToken();
    if (!token) return BackgroundFetch.BackgroundFetchResult.NoData;

    const data = await messageService.getUnreadCount();
    const unread_count = data.total_unread || 0;

    const lastNotifiedStr = await AsyncStorage.getItem('last_notified_unread_count');
    const lastNotified = lastNotifiedStr ? parseInt(lastNotifiedStr) : 0;

    if (unread_count > lastNotified) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "您有新消息",
          body: `您收到了一些新消息，快去柒月半看看吧！`,
        },
        trigger: null,
      });
      await AsyncStorage.setItem('last_notified_unread_count', unread_count.toString());
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    if (unread_count === 0 && lastNotified > 0) {
      await AsyncStorage.setItem('last_notified_unread_count', '0');
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (err) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundFetchAsync() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (e) {
    console.warn('Background fetch registration failed:', e);
  }
}
