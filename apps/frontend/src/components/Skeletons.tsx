import React from 'react';
import { clsx } from 'clsx';
import { GlassCard } from './GlassCard';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, style }) => (
  <div className={clsx("animate-pulse bg-slate-800/50 rounded-md", className)} style={style} />
);

export const CardSkeleton: React.FC = () => (
  <GlassCard className="p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div>
          <Skeleton className="w-32 h-5 mb-2" />
          <Skeleton className="w-24 h-4" />
        </div>
      </div>
      <Skeleton className="w-8 h-8 rounded-lg" />
    </div>
    <div className="space-y-3">
      <Skeleton className="w-full h-2" />
      <div className="flex justify-between">
        <Skeleton className="w-16 h-3" />
        <Skeleton className="w-16 h-3" />
      </div>
    </div>
    <div className="mt-4 flex gap-2">
      <Skeleton className="w-20 h-6 rounded-full" />
      <Skeleton className="w-20 h-6 rounded-full" />
    </div>
  </GlassCard>
);

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <GlassCard key={i} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
          <div className="space-y-2">
            <Skeleton className="w-48 h-5" />
            <Skeleton className="w-32 h-3" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="w-24 h-6 rounded-full" />
          <Skeleton className="w-20 h-8 rounded-lg" />
        </div>
      </GlassCard>
    ))}
  </div>
);

export const ChartSkeleton: React.FC = () => (
  <div className="w-full h-64 flex flex-col justify-end gap-2 px-4 pb-4">
    <div className="flex items-end gap-2 h-full w-full">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="flex-1 rounded-t-sm" 
          style={{ height: `${Math.max(20, Math.random() * 100)}%` }} 
        />
      ))}
    </div>
  </div>
);
