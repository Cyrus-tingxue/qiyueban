import './AnimatedIncenseBurner.css';

function AnimatedIncenseBurner({ onClick, isAnimating = true, size = 90 }) {
    const customStyle = {
        width: `${size}px`,
        height: `${size}px`
    };

    return (
        <div className="animated-avatar-container" style={customStyle} onClick={onClick} title={isAnimating ? "用户菜单" : "选择香炉头像"}>
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#2a0505" />
                        <stop offset="70%" stopColor="#0a0000" />
                        <stop offset="100%" stopColor="#000000" />
                    </radialGradient>

                    <linearGradient id="metalBody" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#1a1a1a" />
                        <stop offset="20%" stopColor="#3a0505" />
                        <stop offset="50%" stopColor="#4a0f0f" />
                        <stop offset="80%" stopColor="#250505" />
                        <stop offset="100%" stopColor="#0a0a0a" />
                    </linearGradient>

                    <linearGradient id="metalRim" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2a2a2a" />
                        <stop offset="30%" stopColor="#661010" />
                        <stop offset="70%" stopColor="#8a1515" />
                        <stop offset="100%" stopColor="#1a1a1a" />
                    </linearGradient>

                    <linearGradient id="legShade" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#000000" />
                        <stop offset="50%" stopColor="#2a0505" />
                        <stop offset="100%" stopColor="#0a0a0a" />
                    </linearGradient>

                    <radialGradient id="emberGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffcc00" />
                        <stop offset="50%" stopColor="#ff3300" />
                        <stop offset="100%" stopColor="rgba(255, 0, 0, 0)" />
                    </radialGradient>

                    <filter id="incenseGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>

                    <filter id="smokeBlur" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="0.6" />
                    </filter>
                </defs>

                {/* 取消了原本的背景圆盘设定，让香炉自然显现无边框遮挡 */}

                <g className={isAnimating ? "incense-animated-group" : "avatar-static-group"}>
                    {/* === 袅袅青烟 === */}
                    <path className="smoke smoke-1" d="M 38 36 C 36 28, 44 20, 38 10 C 34 3, 42 -4, 40 -8"
                        fill="none" stroke="rgba(200, 100, 100, 0.45)" strokeWidth="1.2" filter="url(#smokeBlur)" />
                    <path className="smoke smoke-2" d="M 50 28 C 55 18, 43 8, 50 0 C 56 -8, 45 -14, 50 -18"
                        fill="none" stroke="rgba(220, 220, 220, 0.55)" strokeWidth="1.8" filter="url(#smokeBlur)" />
                    <path className="smoke smoke-3" d="M 62 36 C 64 28, 56 20, 62 10 C 66 3, 58 -4, 60 -8"
                        fill="none" stroke="rgba(200, 100, 100, 0.45)" strokeWidth="1.2" filter="url(#smokeBlur)" />

                    {/* === 香炉后脚 === */}
                    <path d="M 45 68 L 47 88 C 47 91 53 91 53 88 L 55 68 Z" fill="url(#legShade)" stroke="#000" strokeWidth="1.2" />

                    {/* === 香 === */}
                    {/* 左香 */}
                    <line x1="38" y1="38" x2="43" y2="60" stroke="#3d1c10" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="38" y1="36" x2="38.5" y2="40" stroke="#e60000" strokeWidth="1.5" />
                    <circle cx="38" cy="36" r="1.5" fill="url(#emberGlow)" className="incense-glow" filter="url(#incenseGlow)" />
                    <circle cx="38" cy="35" r="1" fill="#aaaaaa" opacity="0.8" />

                    {/* 右香 */}
                    <line x1="62" y1="38" x2="57" y2="60" stroke="#3d1c10" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="62" y1="36" x2="61.5" y2="40" stroke="#e60000" strokeWidth="1.5" />
                    <circle cx="62" cy="36" r="1.5" fill="url(#emberGlow)" className="incense-glow" filter="url(#incenseGlow)" />
                    <circle cx="62" cy="35" r="1" fill="#aaaaaa" opacity="0.8" />

                    {/* 中香 (略高) */}
                    <line x1="50" y1="32" x2="50" y2="61" stroke="#2b1108" strokeWidth="3" strokeLinecap="round" />
                    <line x1="50" y1="30" x2="50" y2="34" stroke="#e60000" strokeWidth="2" />
                    <circle cx="50" cy="30" r="2.2" fill="url(#emberGlow)" className="incense-glow center-glow" filter="url(#incenseGlow)" />
                    <circle cx="50" cy="28.5" r="1.2" fill="#aaaaaa" opacity="0.8" />

                    {/* === 香炉主体 (Bowl) === */}
                    <path d="M 18 60 C 18 92 82 92 82 60 Z" fill="url(#metalBody)" stroke="#0a0000" strokeWidth="1.5" />
                    <path d="M 22 60 C 22 88 78 88 78 60 Z" fill="#150000" opacity="0.4" />

                    {/* 祥云纹饰/回字纹 */}
                    <path d="M 26 66 C 35 58 42 72 45 66 C 50 62 50 70 55 66 C 58 72 65 58 74 66" fill="none" stroke="#e60000" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
                    <path d="M 30 73 C 38 67 44 76 47 72 C 50 69 50 75 53 72 C 56 76 62 67 70 73" fill="none" stroke="#e60000" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
                    <path d="M 38 80 Q 50 85 62 80" fill="none" stroke="#e60000" strokeWidth="0.5" opacity="0.4" />

                    {/* === 前左脚 === */}
                    <path d="M 25 72 Q 22 88 18 95 Q 28 92 33 88 C 32 82 34 75 34 75 Z" fill="url(#legShade)" stroke="#0a0a0a" strokeWidth="1.5" />
                    <path d="M 23 80 Q 22 88 19 93" fill="none" stroke="#e60000" strokeWidth="0.5" opacity="0.6" />

                    {/* === 前右脚 === */}
                    <path d="M 75 72 Q 78 88 82 95 Q 72 92 67 88 C 68 82 66 75 66 75 Z" fill="url(#legShade)" stroke="#0a0a0a" strokeWidth="1.5" />
                    <path d="M 77 80 Q 78 88 81 93" fill="none" stroke="#e60000" strokeWidth="0.5" opacity="0.6" />

                    {/* === 炉口 === */}
                    <ellipse cx="50" cy="59" rx="32" ry="8" fill="url(#metalRim)" stroke="#0a0000" strokeWidth="1.5" />
                    <ellipse cx="50" cy="59" rx="28" ry="5.5" fill="#0f0000" />
                    <ellipse cx="50" cy="59.5" rx="25" ry="4" fill="#3a0000" opacity="0.6" />
                    <ellipse cx="50" cy="59" rx="24" ry="3.5" fill="#2d1c1c" opacity="0.9" />

                    {/* 余火星 */}
                    <circle cx="43" cy="59" r="1" fill="#ff4400" className="incense-glow" filter="url(#incenseGlow)" />
                    <circle cx="56" cy="60" r="0.8" fill="#ff4400" className="incense-glow center-glow" filter="url(#incenseGlow)" />
                    <circle cx="50" cy="58" r="0.6" fill="#ff2200" opacity="0.8" />
                </g>
            </svg>
        </div>
    );
}

export default AnimatedIncenseBurner;
