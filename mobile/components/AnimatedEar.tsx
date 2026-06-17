import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Defs, G, Path, Circle, Rect, Ellipse, Line, LinearGradient, RadialGradient, Stop, ClipPath, Text as SvgText } from 'react-native-svg';


/**
 * 飘动的符纸 - 道教黄符，朱砂符文
 * 透明背景，悬浮飘动动画
 */
function AnimatedEar({ onClick, isAnimating = true, size = 90 }) {
    
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (isAnimating) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, { toValue: 1, duration: 2500, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0, duration: 2500, useNativeDriver: true })
                ])
            ).start();
        } else {
            anim.setValue(0);
        }
    }, [isAnimating]);
    const animatedStyle = {
        transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
            { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) }
        ]
    };


    return (
        <Animated.View style={[{ width: size, height: size }, animatedStyle]}>
            <Svg viewBox="0 0 80 120" >
                <Defs>
                    {/* 古黄纸渐变 */}
                    <LinearGradient id="epPaper" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#d4a84a" />
                        <Stop offset="20%" stopColor="#c89838" />
                        <Stop offset="50%" stopColor="#b88828" />
                        <Stop offset="80%" stopColor="#a87820" />
                        <Stop offset="100%" stopColor="#986818" />
                    </LinearGradient>

                    {/* 纸面光泽 */}
                    <LinearGradient id="epSheen" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#fff" stopOpacity="0.08" />
                        <Stop offset="40%" stopColor="#fff" stopOpacity="0.02" />
                        <Stop offset="60%" stopColor="#fff" stopOpacity="0.12" />
                        <Stop offset="100%" stopColor="#fff" stopOpacity="0" />
                    </LinearGradient>

                    {/* 朱砂红 */}
                    <LinearGradient id="epCinnabar" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="#cc2222" />
                        <Stop offset="50%" stopColor="#aa1111" />
                        <Stop offset="100%" stopColor="#881111" />
                    </LinearGradient>

                    {/* 墨色 */}
                    <LinearGradient id="epInk" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="#1a0505" />
                        <Stop offset="100%" stopColor="#000" />
                    </LinearGradient>

                    {/* 符纸暗红光晕 */}
                    

                    {/* 符文发光 */}
                    

                    {/* 裁切：略带波浪的纸张边缘 */}
                    <ClipPath id="epClip">
                        <Path d="M 8 5 Q 12 3, 16 5 L 18 4 Q 22 3, 25 5 L 40 4 Q 45 3, 50 5 L 55 4 Q 58 3, 62 5 L 65 4 Q 68 3, 72 5
                                 L 73 12 Q 74 18, 73 25 L 74 35 Q 73 42, 74 50 L 73 58 Q 74 65, 73 72 L 74 80 Q 73 86, 74 92 L 73 98 Q 74 104, 72 108
                                 Q 68 110, 65 108 L 62 109 Q 58 110, 55 108 L 50 109 Q 45 110, 40 108 L 25 109 Q 22 110, 18 108 L 16 109 Q 12 110, 8 108
                                 L 7 98 Q 6 92, 7 86 L 6 80 Q 7 72, 6 65 L 7 58 Q 6 50, 7 42 L 6 35 Q 7 25, 6 18 Z" />
                    </ClipPath>
                </Defs>

                {/* 动画组 */}
                <G>

                    {/* ===== 符纸本体 ===== */}
                    <G clipPath="url(#epClip)">
                        {/* 纸张底色 */}
                        <Rect x="5" y="3" width="70" height="110" fill="url(#epPaper)" />

                        {/* 纸面光泽 */}
                        <Rect x="5" y="3" width="70" height="110" fill="url(#epSheen)" />

                        {/* 做旧斑点 */}
                        <G opacity="0.15" fill="#6a4a10">
                            <Circle cx="15" cy="20" r="1.5" />
                            <Circle cx="62" cy="35" r="1" />
                            <Circle cx="20" cy="85" r="2" />
                            <Circle cx="58" cy="95" r="1.2" />
                            <Circle cx="35" cy="55" r="0.8" />
                            <Circle cx="65" cy="70" r="1.8" />
                            <Circle cx="12" cy="60" r="0.6" />
                        </G>

                        {/* 纸张折痕 */}
                        <Line x1="8" y1="38" x2="72" y2="36" stroke="#8a6820" strokeWidth="0.3" opacity="0.2" />
                        <Line x1="6" y1="72" x2="74" y2="74" stroke="#8a6820" strokeWidth="0.3" opacity="0.15" />
                    </G>

                    {/* ===== 边框装饰 ===== */}
                    {/* 朱砂双线边框 */}
                    <Rect x="12" y="10" width="56" height="96" rx="1" fill="none" stroke="url(#epCinnabar)" strokeWidth="1.2" opacity="0.8" />
                    <Rect x="15" y="13" width="50" height="90" rx="0.5" fill="none" stroke="url(#epCinnabar)" strokeWidth="0.5" opacity="0.5" />

                    {/* 四角装饰点 */}
                    <G fill="#aa1111" opacity="0.7">
                        <Circle cx="14" cy="12" r="1.5" />
                        <Circle cx="66" cy="12" r="1.5" />
                        <Circle cx="14" cy="104" r="1.5" />
                        <Circle cx="66" cy="104" r="1.5" />
                    </G>

                    {/* ===== 符文内容 ===== */}
                    <G>

                        {/* 顶部符头：日月/天眼图案 */}
                        <G transform="translate(40, 24)" stroke="url(#epCinnabar)" fill="none" strokeLinecap="round">
                            {/* 天眼外圈 */}
                            <Ellipse cx="0" cy="0" rx="8" ry="5" strokeWidth="1.2" />
                            {/* 瞳孔 */}
                            <Circle cx="0" cy="0" r="2.5" strokeWidth="1" />
                            <Circle cx="0" cy="0" r="0.8" fill="#aa1111" stroke="none" />
                            {/* 上方三道灵光 */}
                            <Line x1="-4" y1="-7" x2="-3" y2="-9" strokeWidth="0.8" />
                            <Line x1="0" y1="-6.5" x2="0" y2="-10" strokeWidth="1" />
                            <Line x1="4" y1="-7" x2="3" y2="-9" strokeWidth="0.8" />
                        </G>

                        {/* 中段主体符文 - 模拟道教符篆 */}
                        <G stroke="url(#epCinnabar)" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            {/* 第一行符字 - "敕" 的抽象符篆 */}
                            <Path d="M 30 38 L 50 38" strokeWidth="1.5" />
                            <Path d="M 40 35 L 40 48" strokeWidth="1.2" />
                            <Path d="M 33 42 L 47 42" strokeWidth="0.8" />
                            <Path d="M 35 45 Q 40 50, 45 45" strokeWidth="0.8" />

                            {/* 第二行 - "令" 的符篆 */}
                            <Path d="M 32 55 L 48 55" strokeWidth="1.3" />
                            <Path d="M 40 52 L 40 62" strokeWidth="1.2" />
                            <Path d="M 34 58 Q 37 63, 40 58 Q 43 63, 46 58" strokeWidth="0.8" />

                            {/* 第三行 - 灵符竖笔 */}
                            <Path d="M 40 66 L 40 82" strokeWidth="1.5" />
                            <Path d="M 34 70 L 46 70" strokeWidth="1" />
                            <Path d="M 36 74 L 44 74" strokeWidth="0.7" />
                            <Path d="M 33 78 L 47 78" strokeWidth="1" />
                            {/* 底部封印弯钩 */}
                            <Path d="M 34 82 C 36 86, 44 86, 46 82" strokeWidth="1.2" />
                        </G>

                        {/* 两侧竖写小字 */}
                        <G stroke="#881111" fill="none" strokeWidth="0.5" opacity="0.5" strokeLinecap="round">
                            {/* 左侧 */}
                            <Line x1="22" y1="38" x2="22" y2="45" />
                            <Line x1="20" y1="41" x2="24" y2="41" />
                            <Line x1="22" y1="50" x2="22" y2="56" />
                            <Line x1="20" y1="53" x2="24" y2="53" />
                            {/* 右侧 */}
                            <Line x1="58" y1="38" x2="58" y2="45" />
                            <Line x1="56" y1="41" x2="60" y2="41" />
                            <Line x1="58" y1="50" x2="58" y2="56" />
                            <Line x1="56" y1="53" x2="60" y2="53" />
                        </G>
                    </G>

                    {/* ===== 底部印章 ===== */}
                    <G transform="translate(40, 95)">
                        <Rect x="-7" y="-6" width="14" height="12" rx="0.5" fill="none" stroke="#cc2222" strokeWidth="1" opacity="0.7" />
                        {/* 篆体简化 "令" */}
                        <Line x1="-3" y1="-3" x2="3" y2="-3" stroke="#cc2222" strokeWidth="0.8" />
                        <Line x1="0" y1="-4" x2="0" y2="3" stroke="#cc2222" strokeWidth="0.8" />
                        <Path d="M -2 1 Q 0 4, 2 1" fill="none" stroke="#cc2222" strokeWidth="0.6" />
                    </G>

                    {/* 纸张边缘轮廓（裁切后的不规则边缘） */}
                    <Path d="M 8 5 Q 12 3, 16 5 L 18 4 Q 22 3, 25 5 L 40 4 Q 45 3, 50 5 L 55 4 Q 58 3, 62 5 L 65 4 Q 68 3, 72 5
                             L 73 12 Q 74 18, 73 25 L 74 35 Q 73 42, 74 50 L 73 58 Q 74 65, 73 72 L 74 80 Q 73 86, 74 92 L 73 98 Q 74 104, 72 108
                             Q 68 110, 65 108 L 62 109 Q 58 110, 55 108 L 50 109 Q 45 110, 40 108 L 25 109 Q 22 110, 18 108 L 16 109 Q 12 110, 8 108
                             L 7 98 Q 6 92, 7 86 L 6 80 Q 7 72, 6 65 L 7 58 Q 6 50, 7 42 L 6 35 Q 7 25, 6 18 Z"
                        fill="none" stroke="#8a6818" strokeWidth="0.5" opacity="0.4"
                    />
                </G>
            </Svg>
        </Animated.View>
    );
}

export default AnimatedEar;
