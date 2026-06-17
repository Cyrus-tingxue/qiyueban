import re

files = [
    'mobile/components/AnimatedCoin.tsx',
    'mobile/components/AnimatedEar.tsx',
    'mobile/components/AnimatedNose.tsx',
    'mobile/components/AnimatedIncenseBurner.tsx'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace broken div
    content = re.sub(r'<div[^>]*>`\}[\s\S]*?>', '<Animated.View style={[{ width: size, height: size }, animatedStyle]}>', content)
    content = re.sub(r'<div[^>]*>', '<Animated.View style={[{ width: size, height: size }, animatedStyle]}>', content)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed!")
