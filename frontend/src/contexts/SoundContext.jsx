import { createContext, useContext, useEffect, useRef, useState } from 'react';

const SoundContext = createContext();

export function SoundProvider({ children }) {
    const [bgmEnabled, setBgmEnabled] = useState(false);
    const bgmAudio = useRef(null);
    const clickAudio = useRef(null);
    const currentBgmIndex = useRef(-1);

    const bgmList = [
        '/assets/sounds/bgm/论坛背景音乐1.mp3',
        '/assets/sounds/bgm/论坛背景音乐2.mp3',
        '/assets/sounds/bgm/论坛背景音乐3.mp3',
        '/assets/sounds/bgm/论坛背景音乐4.mp3',
    ];

    useEffect(() => {
        clickAudio.current = new Audio('/assets/sounds/bgm/按键音效.mp3');
        clickAudio.current.volume = 1.0;

        return () => {
            if (bgmAudio.current) {
                bgmAudio.current.pause();
                bgmAudio.current.src = '';
            }
        };
    }, []);

    const playBgmByIndex = (index) => {
        if (bgmAudio.current) {
            bgmAudio.current.pause();
        }

        bgmAudio.current = new Audio(bgmList[index]);
        bgmAudio.current.volume = 1.0;
        bgmAudio.current.addEventListener('ended', nextBgm);
        bgmAudio.current.play().catch((e) => {
            console.warn('BGM autoplay blocked by browser:', e);
            setBgmEnabled(false);
        });
    };

    const nextBgm = () => {
        if (!bgmEnabled) return;

        let nextIndex;
        if (bgmList.length > 1) {
            do {
                nextIndex = Math.floor(Math.random() * bgmList.length);
            } while (nextIndex === currentBgmIndex.current);
        } else {
            nextIndex = 0;
        }

        currentBgmIndex.current = nextIndex;
        playBgmByIndex(nextIndex);
    };

    useEffect(() => {
        if (bgmEnabled) {
            if (currentBgmIndex.current === -1 || !bgmAudio.current) {
                nextBgm();
            } else {
                bgmAudio.current.play().catch((e) => {
                    console.warn('BGM autoplay blocked by browser:', e);
                    setBgmEnabled(false);
                });
            }
        } else if (bgmAudio.current) {
            bgmAudio.current.pause();
        }
    }, [bgmEnabled]);

    const playSound = (type) => {
        const sounds = {
            click: clickAudio.current,
        };
        const sound = sounds[type];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch((e) => console.warn('Sound play blocked:', e));
        }
    };

    const toggleBgm = () => {
        setBgmEnabled((prev) => !prev);
    };

    return (
        <SoundContext.Provider value={{ bgmEnabled, toggleBgm, playSound, nextBgm }}>
            {children}
        </SoundContext.Provider>
    );
}

export const useSound = () => useContext(SoundContext);
