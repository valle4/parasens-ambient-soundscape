import { useRef, useState, useCallback, ReactNode } from "react";

interface MagneticLinkProps {
  children: ReactNode;
  href: string;
  className?: string;
  strength?: number;
}

const MagneticLink = ({ children, href, className = "", strength = 0.3 }: MagneticLinkProps) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;
    
    setPosition({ x: deltaX, y: deltaY });
  }, [strength]);

  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 });
  }, []);

  return (
    <a
      ref={ref}
      href={href}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: position.x === 0 && position.y === 0 
          ? 'transform 0.5s cubic-bezier(0.33, 1, 0.68, 1)' 
          : 'transform 0.1s ease-out',
        display: 'inline-block',
      }}
    >
      {children}
    </a>
  );
};

export default MagneticLink;
