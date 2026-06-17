import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Defs, G, Path, Circle, Rect, Ellipse, Line, LinearGradient, RadialGradient, Stop, ClipPath, Text as SvgText } from 'react-native-svg';


function AnimatedNose({ onClick, isAnimating = true, size = 90 }) {
    
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
            <Svg viewBox="0 0 100 100" >
                <Defs>
                    {/* Deep red-black background gradient */}
                    <RadialGradient id="darkBg" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor="#400000" stopOpacity="1" />
                        <Stop offset="60%" stopColor="#0a0000" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
                    </RadialGradient>

                    {/* Exquisite candle body texture */}
                    <LinearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor="#444444" />
                        <Stop offset="20%" stopColor="#dcdcdc" />
                        <Stop offset="60%" stopColor="#ffffff" />
                        <Stop offset="85%" stopColor="#909090" />
                        <Stop offset="100%" stopColor="#222222" />
                    </LinearGradient>

                    {/* Thick, dark blood wax */}
                    <LinearGradient id="bloodWax" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor="#3a0000" />
                        <Stop offset="40%" stopColor="#c30000" />
                        <Stop offset="100%" stopColor="#550000" />
                    </LinearGradient>

                    {/* Gradient for the flame body */}
                    <RadialGradient id="flameGrad" cx="50%" cy="80%" r="60%">
                        <Stop offset="0%" stopColor="#ffffff" />
                        <Stop offset="25%" stopColor="#ff4d4d" />
                        <Stop offset="65%" stopColor="#770000" />
                        <Stop offset="100%" stopColor="#110000" />
                    </RadialGradient>

                    

                    

                    

                    
                </Defs>

                {/* 取消了原来的暗色背景盘和暗角，让蜡烛直接悬挂 */}

                <G>
                    {/* Candle Shadow underneath base */}
                    <Ellipse cx="50" cy="91" rx="18" ry="4.5" fill="#000000" opacity="0.9" />

                    {/* Main Candle Body Cylinder */}
                    <Path d="M 40 42 L 40 90 Q 50 94 60 90 L 60 42 Z" fill="url(#bodyGrad)" />

                    {/* Top Inside Rim (Creates depth for the top) */}
                    <Ellipse cx="50" cy="42" rx="10" ry="2.5" fill="#888888" />

                    {/* Melted Top Blood Wax Pool */}
                    <Path d="M 40 42 C 40 44, 45 46, 50 45 C 55 44, 60 45, 60 42 C 60 40, 50 39, 40 42 Z" fill="url(#bloodWax)" />

                    {/* Blood Drip 1 - Gentle Left */}
                    <Path d="M 41 43 Q 41.5 53 41 62 Q 43 64 43 62 Q 43 53 43.5 43 Z" fill="url(#bloodWax)" />

                    {/* Blood Drip 2 - Center Left (Longest and actively dripping) */}
                    <Path d="M 45 43 C 45 53, 44 70, 46 76 C 48 77, 49 71, 48 68 C 47.5 60, 48 50, 48 43 Z" fill="url(#bloodWax)" />
                    <Circle cx="47" cy="80" r="1.5" fill="#c30000" />

                    {/* Blood Drip 3 - Center Right */}
                    <Path d="M 52 43 C 51 50, 52 58, 51 63 C 53 64, 54 60, 54 57 C 53 50, 55 45, 55 43 Z" fill="url(#bloodWax)" />

                    {/* Blood Drip 4 - Far Right Edge */}
                    <Path d="M 57 43 Q 58.5 50 57 56 Q 59 58 59.5 56 Q 59 50 59 43 Z" fill="url(#bloodWax)" />

                    {/* Wick */}
                    <Path d="M 50 41 Q 52 38, 49 33" fill="none" stroke="#080000" strokeWidth="1.5" strokeLinecap="round" />

                    {/* Glowing Wick Embers */}
                    <Circle cx="49" cy="33" r="1.2" fill="#ff6666" />

                    {/* Plume of Black/Deep Red Smoke */}
                    <G opacity="0.45">
                        <Path d="M 49 30 Q 43 20 50 10 Q 55 2 46 -8" fill="none" stroke="#220000" strokeWidth="2.5" />
                        <Path d="M 49 30 Q 56 22 47 12 Q 40 4 52 -5" fill="none" stroke="#000000" strokeWidth="1.5" />
                    </G>

                    {/* Dynamic Flame Components */}
                    <G>
                        {/* Outer Red/Black Aura Glow */}
                        <Path d="M 49 8 C 68 25, 55 35, 49 36 C 43 36, 30 25, 49 8 Z" fill="#ff0000" opacity="0.3" />

                        {/* Main Luminous Flame Body */}
                        <Path d="M 49 14 C 61 25, 54 35, 49 35 C 44 35, 37 25, 49 14 Z" fill="url(#flameGrad)" />

                        {/* Inner Dark Void Core */}
                        <Path d="M 49 26 C 53 31, 51 34, 49 34 C 47 34, 45 31, 49 26 Z" fill="#080000" />
                    </G>

                    {/* Drifting Fire Sparks */}
                    <G>
                        <Circle cx="47" cy="22" r="0.8" fill="#ffaa00" />
                        <Circle cx="52" cy="18" r="0.6" fill="#ff5500" />
                        <Circle cx="49" cy="12" r="1.1" fill="#ff2200" />
                        <Circle cx="51" cy="28" r="0.7" fill="#ffccaa" />
                    </G>
                </G>
            </Svg>
        </Animated.View>
    );
}

export default AnimatedNose;
