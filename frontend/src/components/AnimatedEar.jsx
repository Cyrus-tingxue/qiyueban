import './AnimatedEar.css';

/**
 * 飘动的符纸 - 道教黄符，朱砂符文
 * 透明背景，悬浮飘动动画
 */
function AnimatedEar({ onClick, isAnimating = true, size = 90 }) {
    const customStyle = {
        width: `${size}px`,
        height: `${size}px`
    };

    return (
        <div className="animated-comb-container" style={customStyle} onClick={onClick} title={isAnimating ? "用户菜单" : "选择符纸头像"}>
            <svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                <defs>
                    {/* 古黄纸渐变 */}
                    <linearGradient id="epPaper" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#d4a84a" />
                        <stop offset="20%" stopColor="#c89838" />
                        <stop offset="50%" stopColor="#b88828" />
                        <stop offset="80%" stopColor="#a87820" />
                        <stop offset="100%" stopColor="#986818" />
                    </linearGradient>

                    {/* 纸面光泽 */}
                    <linearGradient id="epSheen" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fff" stopOpacity="0.08" />
                        <stop offset="40%" stopColor="#fff" stopOpacity="0.02" />
                        <stop offset="60%" stopColor="#fff" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                    </linearGradient>

                    {/* 朱砂红 */}
                    <linearGradient id="epCinnabar" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#cc2222" />
                        <stop offset="50%" stopColor="#aa1111" />
                        <stop offset="100%" stopColor="#881111" />
                    </linearGradient>

                    {/* 墨色 */}
                    <linearGradient id="epInk" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#1a0505" />
                        <stop offset="100%" stopColor="#000" />
                    </linearGradient>

                    {/* 符纸暗红光晕 */}
                    <filter id="epGlow" x="-40%" y="-20%" width="180%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
                        <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#aa2222" floodOpacity="0.2" />
                    </filter>

                    {/* 符文发光 */}
                    <filter id="epRuneGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="b" />
                        <feMerge>
                            <feMergeNode in="b" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* 裁切：略带波浪的纸张边缘 */}
                    <clipPath id="epClip">
                        <path d="M 8 5 Q 12 3, 16 5 L 18 4 Q 22 3, 25 5 L 40 4 Q 45 3, 50 5 L 55 4 Q 58 3, 62 5 L 65 4 Q 68 3, 72 5
                                 L 73 12 Q 74 18, 73 25 L 74 35 Q 73 42, 74 50 L 73 58 Q 74 65, 73 72 L 74 80 Q 73 86, 74 92 L 73 98 Q 74 104, 72 108
                                 Q 68 110, 65 108 L 62 109 Q 58 110, 55 108 L 50 109 Q 45 110, 40 108 L 25 109 Q 22 110, 18 108 L 16 109 Q 12 110, 8 108
                                 L 7 98 Q 6 92, 7 86 L 6 80 Q 7 72, 6 65 L 7 58 Q 6 50, 7 42 L 6 35 Q 7 25, 6 18 Z" />
                    </clipPath>
                </defs>

                {/* 动画组 */}
                <g className={isAnimating ? "talisman-float" : "avatar-static-group"} filter="url(#epGlow)">

                    {/* ===== 符纸本体 ===== */}
                    <g clipPath="url(#epClip)">
                        {/* 纸张底色 */}
                        <rect x="5" y="3" width="70" height="110" fill="url(#epPaper)" />

                        {/* 纸面光泽 */}
                        <rect x="5" y="3" width="70" height="110" fill="url(#epSheen)" />

                        {/* 做旧斑点 */}
                        <g opacity="0.15" fill="#6a4a10">
                            <circle cx="15" cy="20" r="1.5" />
                            <circle cx="62" cy="35" r="1" />
                            <circle cx="20" cy="85" r="2" />
                            <circle cx="58" cy="95" r="1.2" />
                            <circle cx="35" cy="55" r="0.8" />
                            <circle cx="65" cy="70" r="1.8" />
                            <circle cx="12" cy="60" r="0.6" />
                        </g>

                        {/* 纸张折痕 */}
                        <line x1="8" y1="38" x2="72" y2="36" stroke="#8a6820" strokeWidth="0.3" opacity="0.2" />
                        <line x1="6" y1="72" x2="74" y2="74" stroke="#8a6820" strokeWidth="0.3" opacity="0.15" />
                    </g>

                    {/* ===== 边框装饰 ===== */}
                    {/* 朱砂双线边框 */}
                    <rect x="12" y="10" width="56" height="96" rx="1" fill="none" stroke="url(#epCinnabar)" strokeWidth="1.2" opacity="0.8" />
                    <rect x="15" y="13" width="50" height="90" rx="0.5" fill="none" stroke="url(#epCinnabar)" strokeWidth="0.5" opacity="0.5" />

                    {/* 四角装饰点 */}
                    <g fill="#aa1111" opacity="0.7">
                        <circle cx="14" cy="12" r="1.5" />
                        <circle cx="66" cy="12" r="1.5" />
                        <circle cx="14" cy="104" r="1.5" />
                        <circle cx="66" cy="104" r="1.5" />
                    </g>

                    {/* ===== 符文内容 ===== */}
                    <g filter="url(#epRuneGlow)" className={isAnimating ? "rune-pulse" : ""}>

                        {/* 顶部符头：日月/天眼图案 */}
                        <g transform="translate(40, 24)" stroke="url(#epCinnabar)" fill="none" strokeLinecap="round">
                            {/* 天眼外圈 */}
                            <ellipse cx="0" cy="0" rx="8" ry="5" strokeWidth="1.2" />
                            {/* 瞳孔 */}
                            <circle cx="0" cy="0" r="2.5" strokeWidth="1" />
                            <circle cx="0" cy="0" r="0.8" fill="#aa1111" stroke="none" className={isAnimating ? "spirit-flicker" : ""} style={{ transformOrigin: '40px 24px' }} />
                            {/* 上方三道灵光 */}
                            <line x1="-4" y1="-7" x2="-3" y2="-9" strokeWidth="0.8" />
                            <line x1="0" y1="-6.5" x2="0" y2="-10" strokeWidth="1" />
                            <line x1="4" y1="-7" x2="3" y2="-9" strokeWidth="0.8" />
                        </g>

                        {/* 中段主体符文 - 模拟道教符篆 */}
                        <g stroke="url(#epCinnabar)" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            {/* 第一行符字 - "敕" 的抽象符篆 */}
                            <path d="M 30 38 L 50 38" strokeWidth="1.5" />
                            <path d="M 40 35 L 40 48" strokeWidth="1.2" />
                            <path d="M 33 42 L 47 42" strokeWidth="0.8" />
                            <path d="M 35 45 Q 40 50, 45 45" strokeWidth="0.8" />

                            {/* 第二行 - "令" 的符篆 */}
                            <path d="M 32 55 L 48 55" strokeWidth="1.3" />
                            <path d="M 40 52 L 40 62" strokeWidth="1.2" />
                            <path d="M 34 58 Q 37 63, 40 58 Q 43 63, 46 58" strokeWidth="0.8" />

                            {/* 第三行 - 灵符竖笔 */}
                            <path d="M 40 66 L 40 82" strokeWidth="1.5" />
                            <path d="M 34 70 L 46 70" strokeWidth="1" />
                            <path d="M 36 74 L 44 74" strokeWidth="0.7" />
                            <path d="M 33 78 L 47 78" strokeWidth="1" />
                            {/* 底部封印弯钩 */}
                            <path d="M 34 82 C 36 86, 44 86, 46 82" strokeWidth="1.2" />
                        </g>

                        {/* 两侧竖写小字 */}
                        <g stroke="#881111" fill="none" strokeWidth="0.5" opacity="0.5" strokeLinecap="round">
                            {/* 左侧 */}
                            <line x1="22" y1="38" x2="22" y2="45" />
                            <line x1="20" y1="41" x2="24" y2="41" />
                            <line x1="22" y1="50" x2="22" y2="56" />
                            <line x1="20" y1="53" x2="24" y2="53" />
                            {/* 右侧 */}
                            <line x1="58" y1="38" x2="58" y2="45" />
                            <line x1="56" y1="41" x2="60" y2="41" />
                            <line x1="58" y1="50" x2="58" y2="56" />
                            <line x1="56" y1="53" x2="60" y2="53" />
                        </g>
                    </g>

                    {/* ===== 底部印章 ===== */}
                    <g transform="translate(40, 95)" className={isAnimating ? "seal-breathe" : ""}>
                        <rect x="-7" y="-6" width="14" height="12" rx="0.5" fill="none" stroke="#cc2222" strokeWidth="1" opacity="0.7" />
                        {/* 篆体简化 "令" */}
                        <line x1="-3" y1="-3" x2="3" y2="-3" stroke="#cc2222" strokeWidth="0.8" />
                        <line x1="0" y1="-4" x2="0" y2="3" stroke="#cc2222" strokeWidth="0.8" />
                        <path d="M -2 1 Q 0 4, 2 1" fill="none" stroke="#cc2222" strokeWidth="0.6" />
                    </g>

                    {/* 纸张边缘轮廓（裁切后的不规则边缘） */}
                    <path d="M 8 5 Q 12 3, 16 5 L 18 4 Q 22 3, 25 5 L 40 4 Q 45 3, 50 5 L 55 4 Q 58 3, 62 5 L 65 4 Q 68 3, 72 5
                             L 73 12 Q 74 18, 73 25 L 74 35 Q 73 42, 74 50 L 73 58 Q 74 65, 73 72 L 74 80 Q 73 86, 74 92 L 73 98 Q 74 104, 72 108
                             Q 68 110, 65 108 L 62 109 Q 58 110, 55 108 L 50 109 Q 45 110, 40 108 L 25 109 Q 22 110, 18 108 L 16 109 Q 12 110, 8 108
                             L 7 98 Q 6 92, 7 86 L 6 80 Q 7 72, 6 65 L 7 58 Q 6 50, 7 42 L 6 35 Q 7 25, 6 18 Z"
                        fill="none" stroke="#8a6818" strokeWidth="0.5" opacity="0.4"
                    />
                </g>
            </svg>
        </div>
    );
}

export default AnimatedEar;
