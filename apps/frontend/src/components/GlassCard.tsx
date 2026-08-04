import React from 'react';
import { cn } from '../utils/cn';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'panel';
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className, 
  variant = 'default',
  hoverEffect = false,
  ...props 
}) => {
  return (
    <div 
      className={cn(
        variant === 'default' ? 'glass' : 'glass-panel',
        'rounded-2xl p-6 transition-all duration-300',
        hoverEffect && 'hover:bg-white/10 hover:-translate-y-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
