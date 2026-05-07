import { useSound } from '../contexts/SoundContext';
import { useLang } from '../contexts/LanguageContext';
import './SoundController.css';

function SoundController() {
    const { bgmEnabled, toggleBgm, nextBgm } = useSound();
    const { t } = useLang();

    return (
        <div className="sound-controller-wrapper">
            <button
                className={`sound-controller ${bgmEnabled ? 'playing' : ''}`}
                onClick={toggleBgm}
                title={bgmEnabled ? t('bgmClose') : t('bgmPlay')}
            >
                <div className="record-disc">
                    <div className="record-center"></div>
                    {bgmEnabled && (
                        <div className="music-notes">
                            <span>♪</span>
                            <span>♫</span>
                        </div>
                    )}
                </div>
                {!bgmEnabled && <div className="mute-slash"></div>}
            </button>

            {bgmEnabled && (
                <button
                    className="next-song-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        nextBgm();
                    }}
                    title={t('nextSong')}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                    </svg>
                </button>
            )}
        </div>
    );
}

export default SoundController;
