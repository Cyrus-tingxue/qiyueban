// 柒月半 移动端配置
export const Config = {
  // API 基础地址（不含 /api 前缀，由 axios baseURL 拼接）
  API_BASE_URL: 'https://cyrusxyz.top/api',

  // 表情图片基础路径
  EMOJI_BASE_URL: 'https://cyrusxyz.top/assets/images/imgs',

  // 轮询间隔（毫秒）
  POLL_INTERVAL_NAV: 3000,      // NavBar 未读数
  POLL_INTERVAL_FRIENDS: 3000,  // 好友/群列表
  POLL_INTERVAL_PRIVATE: 3000,  // 私聊消息
  POLL_INTERVAL_GROUP: 2000,    // 群聊消息

  // 分页
  DEFAULT_PAGE_SIZE: 10,
  MESSAGE_PAGE_SIZE: 50,
  GROUP_MESSAGE_PAGE_SIZE: 100,
  NOTIFICATION_PAGE_SIZE: 20,
};
