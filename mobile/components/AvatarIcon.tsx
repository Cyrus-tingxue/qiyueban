import React from 'react';
import AnimatedCoin from './AnimatedCoin';
import AnimatedNose from './AnimatedNose';
import AnimatedEar from './AnimatedEar';
import AnimatedIncenseBurner from './AnimatedIncenseBurner';

interface AvatarIconProps {
  type: string;
  size?: number;
  isAnimating?: boolean;
}

export default function AvatarIcon({ type, size = 40, isAnimating = true }: AvatarIconProps) {
  switch (type) {
    case 'nose':
      return <AnimatedNose isAnimating={isAnimating} size={size} />;
    case 'ear':
      return <AnimatedEar isAnimating={isAnimating} size={size} />;
    case 'mouth':
      return <AnimatedIncenseBurner isAnimating={isAnimating} size={size} />;
    case 'eye':
    default:
      return <AnimatedCoin isAnimating={isAnimating} size={size} />;
  }
}
