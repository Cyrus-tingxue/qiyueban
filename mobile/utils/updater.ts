import { Alert, Linking, Platform } from 'react-native';
import api from '../services/api';
import { Config } from '../constants/Config';
import Constants from 'expo-constants';

const CURRENT_VERSION_CODE = Constants.expoConfig?.android?.versionCode || 1;

export const updater = {
  checkUpdate: async (showToastIfUpToDate = false) => {
    try {
      const response = await api.get('/app-version/latest', { params: { _: Date.now() } });
      const raw = response.data || {};
      // 兼容旧版 Go API 的 PascalCase 返回和新版客户端约定的 snake_case。
      const latestVersion = {
        version_code: Number(raw.version_code ?? raw.VersionCode ?? 0),
        version_name: String(raw.version_name ?? raw.VersionName ?? ''),
        download_url: String(raw.download_url ?? raw.DownloadURL ?? ''),
        update_log: String(raw.update_log ?? raw.UpdateLog ?? ''),
        force_update: Boolean(raw.force_update ?? raw.ForceUpdate),
      };

      if (!latestVersion.version_code || !latestVersion.download_url) {
        console.warn('Invalid app version response:', raw);
        return;
      }

      if (latestVersion.version_code > CURRENT_VERSION_CODE) {
        Alert.alert(
          `发现新版本 v${latestVersion.version_name || latestVersion.version_code}`,
          latestVersion.update_log || '本次更新包含功能改进和问题修复。',
          [
            {
              text: latestVersion.force_update ? '退出' : '稍后',
              style: 'cancel',
            },
            {
              text: '立即下载',
              onPress: () => {
                let url = latestVersion.download_url;
                if (!/^https?:\/\//i.test(url)) {
                  url = `${Config.API_BASE_URL.replace(/\/api\/?$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
                }
                Linking.openURL(url).catch(error => console.warn('Open update URL failed:', error));
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
