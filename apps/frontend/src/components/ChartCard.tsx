import React from 'react';
import { GlassCard } from './GlassCard';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, children }) => {
  return (
    <GlassCard variant="panel" className="h-full flex flex-col">
      <h3 className="text-lg font-semibold text-white mb-6">{title}</h3>
      <div className="flex-1 w-full min-h-[300px]">
        {children}
      </div>
    </GlassCard>
  );
};
