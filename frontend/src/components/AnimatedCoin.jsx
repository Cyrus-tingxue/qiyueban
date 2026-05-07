import './AnimatedCoin.css';

/**
 * 悬挂的红绳铜钱（极致红黑风格，防止被截断）
 * 仿造参考图：深邃红黑色调，高对比度，血红色的粗中国结，幽暗老旧的大铜钱。
 */
function AnimatedCoin({ onClick, isAnimating = true, size = 90 }) {
    // size 参数控制整体高度, 宽度按 viewBox 比例 (100:180) 自动适配
    const customStyle = {
        width: `${size / 1.8}px`,
        height: `${size}px`,
    };

    return (
        <div
            className={`animated-coin-container ${isAnimating ? 'swinging' : ''}`}
            style={customStyle}
            onClick={onClick}
            title={isAnimating ? "用户菜单" : "登录"}
        >
            {/* 使用 overflow="visible" 防止内置剪裁，视口设定为 100宽 160高 */}
            <svg viewBox="0 0 100 180" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                <defs>
                    {/* 暗黑青铜材质渐变：极强的黑色到暗棕的过渡 */}
                    <radialGradient id="bronzeDark" cx="40%" cy="30%" r="65%">
                        <stop offset="0%" stopColor="#7a5542" />
                        <stop offset="35%" stopColor="#2c1a11" />
                        <stop offset="85%" stopColor="#080302" />
                        <stop offset="100%" stopColor="#000000" />
                    </radialGradient>

                    {/* 阴森金文高光 */}
                    <linearGradient id="textGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#875139" />
                        <stop offset="50%" stopColor="#ab7b5e" />
                        <stop offset="100%" stopColor="#30160d" />
                    </linearGradient>

                    {/* 深血红绳子渐变 */}
                    <linearGradient id="ropeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#380606" />
                        <stop offset="50%" stopColor="#961111" />
                        <stop offset="100%" stopColor="#380606" />
                    </linearGradient>

                    <radialGradient id="bloodBead" cx="35%" cy="35%" r="60%">
                        <stop offset="0%" stopColor="#ff1a1a" />
                        <stop offset="50%" stopColor="#9c0404" />
                        <stop offset="100%" stopColor="#1a0000" />
                    </radialGradient>

                    {/* 夸张的黑色投影让整体脱离背景 */}
                    <filter id="heavyShadow" x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="3" dy="6" stdDeviation="4" floodColor="#000" floodOpacity="1" />
                        <feDropShadow dx="0" dy="0" stdDeviation="15" floodColor="#9c0404" floodOpacity="0.4" />
                    </filter>

                    <filter id="holeShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="1" />
                        {/* 加深内部黑暗感 */}
                        <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#000" floodOpacity="0.9" />
                    </filter>

                    {/* 做旧纹理和脏迹 */}
                    <filter id="decay">
                        <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="5" />
                        <feColorMatrix type="matrix" values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 0.4 0" />
                        <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
                    </filter>
                </defs>

                <g className="coin-group" filter="url(#heavyShadow)">

                    {/* --- 顶部深红吊绳 --- */}
                    {/* 原型环扣绳 */}
                    <path d="M 45 -10 L 48 30 M 55 -10 L 52 30" fill="none" stroke="url(#ropeGrad)" strokeWidth="4.5" strokeLinecap="round" />
                    {/* 绑线 */}
                    <rect x="46" y="8" width="8" height="6" fill="#1f0202" />
                    <line x1="45" y1="11" x2="55" y2="11" stroke="#875139" strokeWidth="1" />

                    {/* --- 血红珠子 --- */}
                    <circle cx="50" cy="30" r="6" fill="url(#bloodBead)" />

                    {/* --- 复杂中国结 (盘长结) --- */}
                    <g transform="translate(50, 48)">
                        {/* 结的主体：由粗壮的深红线条交织而成 */}
                        {/* 菱形骨架 */}
                        <path d="M 0 -10 L 10 0 L 0 10 L -10 0 Z" fill="#750b0b" stroke="#1f0202" strokeWidth="2" strokeLinejoin="round" />
                        {/* 左耳环绕 */}
                        <path d="M -5 -5 C -25 -10 -25 10 -5 5" fill="none" stroke="url(#ropeGrad)" strokeWidth="5" strokeLinecap="round" />
                        {/* 右耳环绕 */}
                        <path d="M 5 -5 C 25 -10 25 10 5 5" fill="none" stroke="url(#ropeGrad)" strokeWidth="5" strokeLinecap="round" />
                        {/* 上耳 */}
                        <path d="M -3 -8 C -10 -25 10 -25 3 -8" fill="none" stroke="url(#ropeGrad)" strokeWidth="4.5" strokeLinecap="round" />
                        {/* 中间交错绳细节 */}
                        <path d="M -8 0 L 8 0 M 0 -8 L 0 8" stroke="#380606" strokeWidth="2" />
                        {/* 垂下的两条粗绳 */}
                        <path d="M -3 9 L -3 28 M 3 9 L 3 28" fill="none" stroke="url(#ropeGrad)" strokeWidth="4.5" />
                    </g>

                    {/* --- 高对比度的暗黑铜钱 (中心在 cy=105) --- */}
                    <g transform="translate(0, 0)">
                        {/* 铜钱本体：极具重量感的黑色边框和暗色金属面 */}
                        <circle cx="50" cy="105" r="38" fill="url(#bronzeDark)" stroke="#050201" strokeWidth="3" filter="url(#decay)" />

                        {/* 边缘双线阴刻 */}
                        <circle cx="50" cy="105" r="34" fill="none" stroke="#0f0704" strokeWidth="4" />
                        <circle cx="50" cy="105" r="35" fill="none" stroke="#26130b" strokeWidth="0.8" />
                        <circle cx="50" cy="105" r="31" fill="none" stroke="#402315" strokeWidth="1.5" opacity="0.6" />

                        {/* 内方孔 (22x22) */}
                        <rect x="39" y="94" width="22" height="22" fill="#000" filter="url(#holeShadow)" />

                        {/* 内孔边缘高光及雕刻感 */}
                        <rect x="36" y="91" width="28" height="28" fill="none" stroke="#0f0704" strokeWidth="4" />
                        <rect x="37.5" y="92.5" width="25" height="25" fill="none" stroke="#26130b" strokeWidth="1" />
                        <rect x="35" y="90" width="30" height="30" fill="none" stroke="#402315" strokeWidth="1" opacity="0.6" />

                        {/* 金文/古体字刻字："寶月通半" 或者 "柒月通寶" */}
                        {/* 按照参考图的高对比风格，字体现出腐蚀后的暗金色 */}
                        <g fill="url(#textGlow)" fontFamily="'Zhi Mang Xing', 'Ma Shan Zheng', 'Kaiti', serif" fontSize="16" fontWeight="900" style={{ textShadow: "1px 2px 3px #000" }}>
                            {/* 上 */}
                            <text x="50" y="85" textAnchor="middle" transform="translate(0, -6)">半</text>
                            {/* 下 */}
                            <text x="50" y="136" textAnchor="middle" transform="translate(0, -11)">月</text>
                            {/* 右 */}
                            <text x="82" y="110" textAnchor="middle" transform="translate(4, -8)">通</text>
                            {/* 左 */}
                            <text x="18" y="110" textAnchor="middle" transform="translate(-4, -8)">寶</text>
                        </g>

                        {/* --- 穿孔的红绳 --- */}
                        {/* 从上面的盘长结下来 */}
                        <path d="M 47 75 L 47 101 m 6 -26 L 53 101" fill="none" stroke="url(#ropeGrad)" strokeWidth="5.5" strokeLinecap="round" />
                        {/* 穿出孔缝在下唇交织 */}
                        <path d="M 44 105 L 44 115" stroke="#4a0404" strokeWidth="5" />
                        <path d="M 56 105 L 56 115" stroke="#4a0404" strokeWidth="5" />
                        {/* 下方汇总结 */}
                        <path d="M 44 114 C 44 125 47 130 47 135 M 56 114 C 56 125 53 130 53 135" fill="none" stroke="url(#ropeGrad)" strokeWidth="5.5" strokeLinecap="round" />
                        <rect x="46" y="118" width="8" height="5" fill="#1f0202" />
                    </g>

                    {/* --- 浓密的底部流苏 --- */}
                    <g transform="translate(0, 133)">
                        {/* 顶帽和两颗小珠子 */}
                        <rect x="46" y="0" width="8" height="12" rx="1.5" fill="#1f0202" />
                        <circle cx="48" cy="18" r="3" fill="url(#bloodBead)" />
                        <circle cx="52" cy="18" r="3" fill="url(#bloodBead)" />

                        {/* 流苏线条，极长的红黑穗子 */}
                        <g stroke="url(#ropeGrad)" strokeLinecap="round">
                            {/* 外侧较短 */}
                            <path d="M 46 22 Q 35 45 42 75" fill="none" strokeWidth="2.5" />
                            <path d="M 54 22 Q 65 45 58 75" fill="none" strokeWidth="2.5" />

                            {/* 中间厚实的流苏从22垂下直到85 */}
                            <path d="M 48 22 Q 46 50 49 85" fill="none" strokeWidth="3" />
                            <path d="M 52 22 Q 54 50 51 85" fill="none" strokeWidth="3" />
                            <path d="M 50 22 C 48 40 52 60 50 85" fill="none" strokeWidth="3.5" />

                            {/* 最内发丝暗线 */}
                            <path d="M 49 22 Q 48 50 47 80" fill="none" stroke="#260303" strokeWidth="1" />
                            <path d="M 51 22 Q 52 50 53 80" fill="none" stroke="#260303" strokeWidth="1" />
                        </g>
                    </g>

                </g>
            </svg>
        </div>
    );
}

export default AnimatedCoin;
