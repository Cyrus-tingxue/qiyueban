import { Alert, Linking, Platform } from 'react-native';
import api from '../services/api';
import Config from '../constants/Config';
import Constants from 'expo-constants';

const CURRENT_VERSION_CODE = Constants.expoConfig?.android?.versionCode || 1;

export const updater = {
  checkUpdate: async (showToastIfUpToDate = false) => {
    try {
      const response = await api.get('/app-version/latest');
      const latestVersion = response.data;

      if (latestVersion.version_code > CURRENT_VERSION_CODE) {
        Alert.alert(
          `发现新版本 v${latestVersion.version_name}`,
          latestVersion.update_log,
          [
            {
              text: latestVersion.force_update ? '退出' : '稍后',
              style: 'cancel',
              onPress: () => {
                if (latestVersion.force_update) {
                  // 在真实环境中可能需要用 BackHandler.exitApp()
                }
              }
            },
            {
              text: '立即下载',
              onPress: () => {
                let url = latestVersion.download_url;
                if (!url.startsWith('http')) {
                  // 如果是相对路径，拼接上服务器基础URL
                  url = `${Config.API_URL.replace('/api', '')}${url.startsWith('/') ? '' : '/'}${url}`;
                }
                Linking.openURL(url);
              }
            }
          ],
          { cancelable: !latestVersion.force_update }
        );
      } else if (showToastIfUpToDate) {
        Alert.alert('提示', '当前已是最新版本');
      }
    } catch (error) {
      console.warn('Check update failed:', error);
      if (showToastIfUpToDate) {
        Alert.alert('提示', '检查更新失败');
      }
    }
  }
};
