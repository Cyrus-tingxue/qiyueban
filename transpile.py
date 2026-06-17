import re

files = [
    ('frontend/src/components/AnimatedCoin.jsx', 'mobile/components/AnimatedCoin.tsx'),
    ('frontend/src/components/AnimatedEar.jsx', 'mobile/components/AnimatedEar.tsx'),
    ('frontend/src/components/AnimatedNose.jsx', 'mobile/components/AnimatedNose.tsx'),
    ('frontend/src/components/AnimatedIncenseBurner.jsx', 'mobile/components/AnimatedIncenseBurner.tsx')
]

for src, dest in files:
    with open(src, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = re.sub(r"import '\..*\.css';", "", content)
    
    rn_imports = "import React, { useEffect, useRef } from 'react';\nimport { Animated } from 'react-native';\nimport Svg, { Defs, G, Path, Circle, Rect, Ellipse, Line, LinearGradient, RadialGradient, Stop, ClipPath, Text as SvgText } from 'react-native-svg';\n"
    content = re.sub(r"^import .*?\n", "", content, flags=re.MULTILINE)
    content = rn_imports + content
    
    content = re.sub(r'<div className=.*?style=\{customStyle\}.*?>', '<Animated.View style={[{ width: size, height: size }, animatedStyle]}>', content)
    content = content.replace('</div>', '</Animated.View>')
    content = re.sub(r'onClick=\{onClick\}', '', content)
    content = re.sub(r'title=\{.*?\}', '', content)
    
    replacements = {
        '<svg': '<Svg', '</svg>': '</Svg>',
        '<defs': '<Defs', '</defs>': '</Defs>',
        '<g': '<G', '</g>': '</G>',
        '<path': '<Path',
        '<circle': '<Circle',
        '<rect': '<Rect',
        '<ellipse': '<Ellipse',
        '<line': '<Line',
        '<linearGradient': '<LinearGradient', '</linearGradient>': '</LinearGradient>',
        '<radialGradient': '<RadialGradient', '</radialGradient>': '</RadialGradient>',
        '<stop': '<Stop',
        '<clipPath': '<ClipPath', '</clipPath>': '</ClipPath>',
        '<text': '<SvgText', '</text>': '</SvgText>'
    }
    for k, v in replacements.items():
        content = content.replace(k, v)
        
    content = re.sub(r'<filter.*?</filter>', '', content, flags=re.DOTALL)
    content = re.sub(r' filter=".*?"', '', content)
    
    content = re.sub(r' className=\{.*?\}', '', content)
    content = re.sub(r' className=".*?"', '', content)
    
    content = re.sub(r' style=\{\{.*?\}\}', '', content)
    
    func_match = re.search(r'function (\w+)\(\{.*?\}\) \{', content)
    if func_match:
        anim_code = """
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
"""
        content = re.sub(r'const customStyle = \{.*?\};', anim_code, content, flags=re.DOTALL)
        # Fix export
        content = content.replace('export default ' + func_match.group(1) + ';', 'export default ' + func_match.group(1) + ';')

    # Fix specific SVG attributes causing issues
    content = content.replace('xmlns="http://www.w3.org/2000/svg"', '')
        
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done")
