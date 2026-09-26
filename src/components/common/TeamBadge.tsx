import React, { useState } from 'react';
import { Team } from '../../types';

interface TeamBadgeProps {
  team?: Partial<Team> | null;
  color?: string;
  logoUrl?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const TeamBadge: React.FC<TeamBadgeProps> = ({
  team,
  color,
  logoUrl,
  name,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const teamColor = color || team?.color || '#10b981';
  const effectiveLogo = !imageError ? (logoUrl || team?.logoUrl) : null;
  const teamName = name || team?.name || 'Team';

  const sizeClasses = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  if (effectiveLogo) {
    return (
      <img
        src={effectiveLogo}
        alt={teamName}
        onError={() => setImageError(true)}
        className={`${currentSizeClass} rounded-full object-cover border border-slate-700/80 shadow-sm shrink-0 bg-slate-900 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${currentSizeClass} rounded-full shrink-0 shadow-sm border border-black/20 ${className}`}
      style={{ backgroundColor: teamColor }}
      title={teamName}
    />
  );
};
