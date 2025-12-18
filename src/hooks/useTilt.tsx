import { useRef, useCallback, useState } from "react";

interface TiltValues {
  rotateX: number;
  rotateY: number;
  scale: number;
}

interface UseTiltOptions {
  max?: number;
  scale?: number;
  speed?: number;
}

export const useTilt = (options: UseTiltOptions = {}) => {
  const { max = 8, scale = 1.02, speed = 400 } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<TiltValues>({ rotateX: 0, rotateY: 0, scale: 1 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -max;
    const rotateY = ((x - centerX) / centerX) * max;
    
    setTilt({ rotateX, rotateY, scale });
  }, [max, scale]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setTilt({ rotateX: 0, rotateY: 0, scale: 1 });
  }, []);

  const style = {
    transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.scale})`,
    transition: isHovering ? `transform ${speed / 4}ms ease-out` : `transform ${speed}ms ease-out`,
  };

  return {
    ref,
    style,
    isHovering,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  };
};
