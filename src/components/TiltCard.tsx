import { ReactNode } from "react";
import { useTilt } from "@/hooks/useTilt";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  glowColor?: string;
}

const TiltCard = ({ children, className = "", onClick, glowColor = "hsla(260, 50%, 50%, 0.15)" }: TiltCardProps) => {
  const { ref, style, isHovering, handlers } = useTilt({ max: 6, scale: 1.01 });

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={style}
      onClick={onClick}
      {...handlers}
    >
      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${glowColor}, transparent 70%)`,
          opacity: isHovering ? 1 : 0,
        }}
      />
      {children}
    </div>
  );
};

export default TiltCard;
