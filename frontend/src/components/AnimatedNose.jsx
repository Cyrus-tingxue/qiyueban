import './AnimatedNose.css';

function AnimatedNose({ onClick, isAnimating = true, size = 90 }) {
    const customStyle = {
        width: `${size}px`,
        height: `${size}px`
    };

    return (
        <div className="animated-avatar-container" style={customStyle} onClick={onClick} title={isAnimating ? "用户菜单" : "选择头像"}>
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    {/* Deep red-black background gradient */}
                    <radialGradient id="darkBg" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#400000" stopOpacity="1" />
                        <stop offset="60%" stopColor="#0a0000" stopOpacity="1" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="1" />
                    </radialGradient>

                    {/* Exquisite candle body texture */}
                    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#444444" />
                        <stop offset="20%" stopColor="#dcdcdc" />
                        <stop offset="60%" stopColor="#ffffff" />
                        <stop offset="85%" stopColor="#909090" />
                        <stop offset="100%" stopColor="#222222" />
                    </linearGradient>

                    {/* Thick, dark blood wax */}
                    <linearGradient id="bloodWax" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3a0000" />
                        <stop offset="40%" stopColor="#c30000" />
                        <stop offset="100%" stopColor="#550000" />
                    </linearGradient>

                    {/* Gradient for the flame body */}
                    <radialGradient id="flameGrad" cx="50%" cy="80%" r="60%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="25%" stopColor="#ff4d4d" />
                        <stop offset="65%" stopColor="#770000" />
                        <stop offset="100%" stopColor="#110000" />
                    </radialGradient>

                    <filter id="glowLight" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1.2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <filter id="glowHeavy" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="1.5" />
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="-0.5" dy="1.5" stdDeviation="1" floodColor="#000000" floodOpacity="0.8" />
                    </filter>

                    <filter id="blurSmoke">
                        <feGaussianBlur stdDeviation="1" />
                    </filter>
                </defs>

                {/* 取消了原来的暗色背景盘和暗角，让蜡烛直接悬挂 */}

                <g className={isAnimating ? "candle-animated-group" : "avatar-static-group"}>
                    {/* Candle Shadow underneath base */}
                    <ellipse cx="50" cy="91" rx="18" ry="4.5" fill="#000000" opacity="0.9" filter="blur(1.5px)" />

                    {/* Main Candle Body Cylinder */}
                    <path d="M 40 42 L 40 90 Q 50 94 60 90 L 60 42 Z" fill="url(#bodyGrad)" />

                    {/* Top Inside Rim (Creates depth for the top) */}
                    <ellipse cx="50" cy="42" rx="10" ry="2.5" fill="#888888" />

                    {/* Melted Top Blood Wax Pool */}
                    <path d="M 40 42 C 40 44, 45 46, 50 45 C 55 44, 60 45, 60 42 C 60 40, 50 39, 40 42 Z" fill="url(#bloodWax)" />

                    {/* Blood Drip 1 - Gentle Left */}
                    <path d="M 41 43 Q 41.5 53 41 62 Q 43 64 43 62 Q 43 53 43.5 43 Z" fill="url(#bloodWax)" filter="url(#dropShadow)" />

                    {/* Blood Drip 2 - Center Left (Longest and actively dripping) */}
                    <path d="M 45 43 C 45 53, 44 70, 46 76 C 48 77, 49 71, 48 68 C 47.5 60, 48 50, 48 43 Z" fill="url(#bloodWax)" filter="url(#dropShadow)" />
                    <circle cx="47" cy="80" r="1.5" fill="#c30000" className={isAnimating ? "drip-drop" : ""} />

                    {/* Blood Drip 3 - Center Right */}
                    <path d="M 52 43 C 51 50, 52 58, 51 63 C 53 64, 54 60, 54 57 C 53 50, 55 45, 55 43 Z" fill="url(#bloodWax)" filter="url(#dropShadow)" />

                    {/* Blood Drip 4 - Far Right Edge */}
                    <path d="M 57 43 Q 58.5 50 57 56 Q 59 58 59.5 56 Q 59 50 59 43 Z" fill="url(#bloodWax)" filter="url(#dropShadow)" />

                    {/* Wick */}
                    <path d="M 50 41 Q 52 38, 49 33" fill="none" stroke="#080000" strokeWidth="1.5" strokeLinecap="round" />

                    {/* Glowing Wick Embers */}
                    <circle cx="49" cy="33" r="1.2" fill="#ff6666" filter="url(#glowLight)" />

                    {/* Plume of Black/Deep Red Smoke */}
                    <g opacity="0.45" filter="url(#blurSmoke)">
                        <path d="M 49 30 Q 43 20 50 10 Q 55 2 46 -8" fill="none" stroke="#220000" strokeWidth="2.5" className={isAnimating ? "smoke-anim-1" : ""} />
                        <path d="M 49 30 Q 56 22 47 12 Q 40 4 52 -5" fill="none" stroke="#000000" strokeWidth="1.5" className={isAnimating ? "smoke-anim-2" : ""} />
                    </g>

                    {/* Dynamic Flame Components */}
                    <g className={isAnimating ? "flame-pulsate" : ""}>
                        {/* Outer Red/Black Aura Glow */}
                        <path d="M 49 8 C 68 25, 55 35, 49 36 C 43 36, 30 25, 49 8 Z" fill="#ff0000" opacity="0.3" filter="url(#glowHeavy)" className={isAnimating ? "flame-aura" : ""} />

                        {/* Main Luminous Flame Body */}
                        <path d="M 49 14 C 61 25, 54 35, 49 35 C 44 35, 37 25, 49 14 Z" fill="url(#flameGrad)" filter="url(#glowLight)" />

                        {/* Inner Dark Void Core */}
                        <path d="M 49 26 C 53 31, 51 34, 49 34 C 47 34, 45 31, 49 26 Z" fill="#080000" />
                    </g>

                    {/* Drifting Fire Sparks */}
                    <g className={isAnimating ? "sparks-group" : ""}>
                        <circle cx="47" cy="22" r="0.8" fill="#ffaa00" className="spark s1" filter="url(#glowLight)" />
                        <circle cx="52" cy="18" r="0.6" fill="#ff5500" className="spark s2" filter="url(#glowLight)" />
                        <circle cx="49" cy="12" r="1.1" fill="#ff2200" className="spark s3" filter="url(#glowLight)" />
                        <circle cx="51" cy="28" r="0.7" fill="#ffccaa" className="spark s4" filter="url(#glowLight)" />
                    </g>
                </g>
            </svg>
        </div>
    );
}

export default AnimatedNose;
