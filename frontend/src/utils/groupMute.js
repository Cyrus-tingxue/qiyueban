const MUTED_GROUPS_STORAGE_KEY = 'mutedGroupIds';

const readMutedGroupIds = () => {
    if (typeof window === 'undefined') return [];

    try {
        const raw = window.localStorage.getItem(MUTED_GROUPS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((item) => parseInt(item, 10))
            .filter((item, index, list) => Number.isInteger(item) && item > 0 && list.indexOf(item) === index);
    } catch (error) {
        console.warn('Failed to read muted groups from localStorage:', error);
        return [];
    }
};

const writeMutedGroupIds = (groupIds) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MUTED_GROUPS_STORAGE_KEY, JSON.stringify(groupIds));
    window.dispatchEvent(new CustomEvent('groupMuteChanged', { detail: { groupIds } }));
};

export const getMutedGroupIds = () => readMutedGroupIds();

export const isGroupMuted = (groupId) => readMutedGroupIds().includes(groupId);

export const setGroupMuted = (groupId, muted) => {
    const groupIds = readMutedGroupIds();
    const nextGroupIds = muted
        ? Array.from(new Set([...groupIds, groupId]))
        : groupIds.filter((item) => item !== groupId);

    writeMutedGroupIds(nextGroupIds);
    return nextGroupIds;
};
