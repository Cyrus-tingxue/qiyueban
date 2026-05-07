import { createContext, useContext, useEffect, useRef, useState } from 'react';

const SoundContext = createContext();

export function SoundProvider({ children }) {
    const [bgmEnabled, setBgmEnabled] = useState(false);
    const bgmAudio = useRef(null);
    const clickAudio = useRef(null);
    const notificationAudio = useRef(null);

    // 背景音乐列表
    const bgmList = [
        '/assets/sounds/bgm/论坛背景音乐1.mp3',
        '/assets/sounds/bgm/论坛背景音乐2.mp3',
        '/assets/sounds/bgm/论坛背景音乐3.mp3',
        '/assets/sounds/bgm/论坛背景音乐4.mp3'
    ];
    // 当前播放的音乐索引记录
    const currentBgmIndex = useRef(-1);

    // 初始化音效（背景音乐延迟到需要播放时初始化）
    useEffect(() => {
        clickAudio.current = new Audio('/assets/sounds/bgm/按键音效.mp3');
        clickAudio.current.volume = 1.0;

        notificationAudio.current = new Audio('/assets/sounds/bgm/消息提示音.mp3');
        notificationAudio.current.volume = 1.0;

        return () => {
            if (bgmAudio.current) {
                bgmAudio.current.pause();
                bgmAudio.current.src = "";
            }
        };
    }, []);

    // 播放指定索引的背景音乐
    const playBgmByIndex = (index) => {
        if (bgmAudio.current) {
            bgmAudio.current.pause();
        }

        bgmAudio.current = new Audio(bgmList[index]);
        bgmAudio.current.volume = 1.0;

        // 监听播放结束，自动切下一首随机
        bgmAudio.current.addEventListener('ended', nextBgm);

        bgmAudio.current.play().catch(e => {
            console.warn('BGM autoplay blocked by browser:', e);
            setBgmEnabled(false);
        });
    };

    // 切歌：随机选择一首不同的音乐
    const nextBgm = () => {
        if (!bgmEnabled) return;

        let nextIndex;
        if (bgmList.length > 1) {
            // 确保下一首不和当前这首一样
            do {
                nextIndex = Math.floor(Math.random() * bgmList.length);
            } while (nextIndex === currentBgmIndex.current);
        } else {
            nextIndex = 0;
        }

        currentBgmIndex.current = nextIndex;
        playBgmByIndex(nextIndex);
    };

    // 监控背景音乐开关状态
    useEffect(() => {
        if (bgmEnabled) {
            if (currentBgmIndex.current === -1 || !bgmAudio.current) {
                // 第一次开启，随机播放一首
                nextBgm();
            } else {
                // 恢复播放当前这首
                bgmAudio.current.play().catch(e => {
                    console.warn('BGM autoplay blocked by browser:', e);
                    setBgmEnabled(false);
                });
            }
        } else if (!bgmEnabled && bgmAudio.current) {
            bgmAudio.current.pause();
        }
    }, [bgmEnabled]);

    // 播放指定音效函数
    const playSound = (type) => {
        const sounds = {
            click: clickAudio.current,
            notification: notificationAudio.current
        };
        const sound = sounds[type];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.warn('Sound play blocked:', e));
        }
    };

    const toggleBgm = () => {
        setBgmEnabled(prev => !prev);
    };

    return (
        <SoundContext.Provider value={{ bgmEnabled, toggleBgm, playSound, nextBgm }}>
            {children}
        </SoundContext.Provider>
    );
}

export const useSound = () => {
    return useContext(SoundContext);
};
