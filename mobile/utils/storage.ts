import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: 'token',
  USER: 'user',
  LANG: 'lang',
  MUTED_GROUPS: 'mutedGroupIds',
  ANNOUNCEMENT_DISMISSED: 'announcement_dismissed',
};

export const storage = {
  // Token
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.TOKEN);
  },
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.TOKEN, token);
  },
  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.TOKEN);
  },

  // User
  async getUser(): Promise<any | null> {
    const raw = await AsyncStorage.getItem(KEYS.USER);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        await AsyncStorage.removeItem(KEYS.USER);
        return null;
      }
    }
    return null;
  },
  async setUser(user: any): Promise<void> {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  },
  async removeUser(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.USER);
  },

  // Language
  async getLang(): Promise<string> {
    return (await AsyncStorage.getItem(KEYS.LANG)) || 'zh';
  },
  async setLang(lang: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.LANG, lang);
  },

  // Muted Groups
  async getMutedGroupIds(): Promise<number[]> {
    const raw = await AsyncStorage.getItem(KEYS.MUTED_GROUPS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item: any) => parseInt(item, 10))
            .filter((item: number, index: number, list: number[]) =>
              Number.isInteger(item) && item > 0 && list.indexOf(item) === index
            );
        }
      } catch {}
    }
    return [];
  },
  async setMutedGroupIds(groupIds: number[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.MUTED_GROUPS, JSON.stringify(groupIds));
  },

  // Announcement dismissed
  async getDismissedAnnouncement(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.ANNOUNCEMENT_DISMISSED);
  },
  async setDismissedAnnouncement(content: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.ANNOUNCEMENT_DISMISSED, content);
  },

  // Clear all
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER]);
  },
};
