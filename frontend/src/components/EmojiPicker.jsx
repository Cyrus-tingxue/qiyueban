import { useState, useRef, useEffect } from 'react';
import { useLang } from '../contexts/LanguageContext';
import './EmojiPicker.css';

const EMOJIS = [
    { name: '哦哟', file: '哦哟.jpg' },
    { name: '哭哭', file: '哭哭.jpg' },
    { name: '喜欢', file: '喜欢.png' },
    { name: '委屈屈', file: '委屈屈.png' },
    { name: '帅气', file: '帅气.png' },
    { name: '平静', file: '平静.png' },
    { name: '开心', file: '开心.jpg' },
    { name: '惊恐', file: '惊恐.png' },
    { name: '惊讶', file: '惊讶.png' },
    { name: '愤怒', file: '愤怒.png' },
    { name: '无语', file: '无语.png' },
    { name: '爱心', file: '爱心.png' },
    { name: '疑问', file: '疑问.jpg' },
    { name: '小七-开心', file: '小七-开心.png' },
    { name: '小七-沉默', file: '小七-沉默.png' },
    { name: '小七-悲伤', file: '小七-悲伤.png' },
    { name: '小七-疑问', file: '小七-疑问.png' },
    { name: '黄符-哭', file: '黄符-哭.png' },
    { name: '黄符-威胁', file: '黄符-威胁.png' },
    { name: '黄符-抱抱', file: '黄符-抱抱.png' },
    { name: '黄符-累趴', file: '黄符-累趴.png' },
];

function EmojiPicker({ onSelect }) {
    const [open, setOpen] = useState(false);
    const pickerRef = useRef(null);
    const { t } = useLang();

    // 点击外部关闭面板
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const handleSelect = (emoji) => {
        onSelect(`[emoji:${emoji.file}]`);
        setOpen(false);
    };

    return (
        <div className="emoji-picker-wrapper" ref={pickerRef}>
            <button
                type="button"
                className="emoji-picker-trigger"
                onClick={() => setOpen(!open)}
                title={t('emojiBtn')}
            >
                {t('emojiBtn')}
            </button>
            {open && (
                <>
                    <div className="emoji-picker-overlay" onClick={() => setOpen(false)} />
                    <div className="emoji-picker-panel">
                        <div className="emoji-picker-grid">
                            {EMOJIS.map((emoji) => (
                                <button
                                    key={emoji.file}
                                    type="button"
                                    className="emoji-picker-item"
                                    onClick={() => handleSelect(emoji)}
                                    title={emoji.name}
                                >
                                    <img
                                        src={`/assets/images/imgs/${emoji.file}`}
                                        alt={emoji.name}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default EmojiPicker;
