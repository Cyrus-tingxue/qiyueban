import AnimatedCoin from './AnimatedCoin';
import AnimatedNose from './AnimatedNose';
import AnimatedEar from './AnimatedEar';
import AnimatedIncenseBurner from './AnimatedIncenseBurner';

/**
 * 统一的头像组件调度器
 * 根据传入的 type 渲染对应部位的动画头像
 */
function AvatarIcon({ type, onClick, isAnimating = true, size = 90 }) {
    switch (type) {
        case 'nose':
            return <AnimatedNose onClick={onClick} isAnimating={isAnimating} size={size} />;
        case 'ear':
            return <AnimatedEar onClick={onClick} isAnimating={isAnimating} size={size} />;
        case 'mouth':
            return <AnimatedIncenseBurner onClick={onClick} isAnimating={isAnimating} size={size} />;
        case 'eye':
        default:
            return <AnimatedCoin onClick={onClick} isAnimating={isAnimating} size={size} />;
    }
}

export default AvatarIcon;
