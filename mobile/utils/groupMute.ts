import { storage } from '../utils/storage';
import { eventBus, Events } from '../utils/events';

const MUTED_GROUPS_KEY = 'mutedGroupIds';

export const getMutedGroupIds = async (): Promise<number[]> => {
  return storage.getMutedGroupIds();
};

export const isGroupMuted = async (groupId: number): Promise<boolean> => {
  const ids = await storage.getMutedGroupIds();
  return ids.includes(groupId);
};

export const setGroupMuted = async (groupId: number, muted: boolean): Promise<number[]> => {
  const groupIds = await storage.getMutedGroupIds();
  const nextGroupIds = muted
    ? Array.from(new Set([...groupIds, groupId]))
    : groupIds.filter((item) => item !== groupId);

  await storage.setMutedGroupIds(nextGroupIds);
  eventBus.emit(Events.GROUP_MUTE_CHANGED, { groupIds: nextGroupIds });
  return nextGroupIds;
};
