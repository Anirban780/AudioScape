import React from 'react';

/**
 * AudioScape Minimalist Brand Logo Component
 * 
 * Aesthetic: Aura Lumina x Midnight Studio
 * Concept: Geometric 'A' lettermark forged from vertical equalizer / soundwave bars
 * with Electric Neon Cyan (#00F0FF) to Velvet Violet (#8A2BE2) & Soft Magenta (#FF66CC) glow.
 */
export const AudioScapeMark = ({
  size = 32,
  variant = 'gradient',
  className = '',
  hasGlow = true,
}) => {
  const gradientId = `audioscape-mark-grad-${React.useId().replace(/:/g, '')}`;
  const glowId = `audioscape-glow-${React.useId().replace(/:/g, '')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AudioScape Logo Mark"
    >
      <defs>
        {variant === 'gradient' && (
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="55%" stopColor="#8A2BE2" />
            <stop offset="100%" stopColor="#FF66CC" />
          </linearGradient>
        )}
        {hasGlow && (
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      <g filter={hasGlow ? `url(#${glowId})` : undefined}>
        {/* Architectural 'A' Chevron Frame */}
        <path 
          d="M 50 14 
             C 52.4 14, 54.8 15.6, 56 18.2 
             L 84 75 
             C 85.6 78.5, 83.6 81.5, 79.8 81.5 
             L 65.2 81.5 
             C 62.5 81.5, 60.1 79.8, 58.9 77.2 
             L 50 58.5 
             L 41.1 77.2 
             C 39.9 79.8, 37.5 81.5, 34.8 81.5 
             L 20.2 81.5 
             C 16.4 81.5, 14.4 78.5, 16 75 
             L 44 18.2 
             C 45.2 15.6, 47.6 14, 50 14 Z" 
          fill={variant === 'monochrome' ? 'currentColor' : `url(#${gradientId})`} 
        />

        {/* Precision Audio Waveform Pulse Crossbar */}
        <path 
          d="M 26 60.5 
             L 36.5 60.5 
             Q 43.2 46.5, 50 60.5 
             T 63.5 60.5 
             L 74 60.5" 
          fill="none" 
          stroke={variant === 'monochrome' ? 'currentColor' : '#00F0FF'} 
          strokeWidth="5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </g>
    </svg>
  );
};

export const AudioScapeLogo = ({
  size = 36,
  showWordmark = true,
  className = '',
  wordmarkClassName = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Contained Glass Icon Container */}
      <div className="relative flex items-center justify-center p-2 rounded-xl bg-[#0A0E1A]/80 border border-[#00F0FF]/30 shadow-[0_0_15px_rgba(0,240,255,0.2)] backdrop-blur-md transition-transform hover:scale-105 duration-200">
        <AudioScapeMark size={size} variant="gradient" hasGlow={true} />
      </div>

      {/* Typography Wordmark */}
      {showWordmark && (
        <span
          className={`font-display text-2xl font-black tracking-tight text-white ${wordmarkClassName}`}
          style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif" }}
        >
          Audio<span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#8A2BE2]">Scape</span>
        </span>
      )}
    </div>
  );
};

export default AudioScapeLogo;
