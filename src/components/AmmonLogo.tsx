import React from 'react';

interface AmmonLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'white';
}

export const AmmonLogo: React.FC<AmmonLogoProps> = ({ className = '', variant = 'full' }) => {
  const isWhite = variant === 'white';
  const primaryColor = isWhite ? '#FFFFFF' : '#176B37';
  const secondaryColor = isWhite ? '#EAF3ED' : '#14532D';
  const textColor = isWhite ? '#FFFFFF' : '#252525';
  const subtextColor = isWhite ? '#EAF3ED' : '#4B5563';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Official AMMON Emblem SVG */}
      <div className="relative shrink-0 w-11 h-11 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer circular swoosh */}
          <circle cx="50" cy="50" r="46" stroke={primaryColor} strokeWidth="4" strokeDasharray="180 30" strokeLinecap="round" />
          {/* Stylized dots above */}
          <circle cx="36" cy="18" r="3.5" fill={primaryColor} />
          <circle cx="48" cy="14" r="4" fill={secondaryColor} />
          <circle cx="62" cy="18" r="3.5" fill={primaryColor} />
          
          {/* Green crescent protective swoosh */}
          <path
            d="M20 60 C 20 82, 75 88, 84 54 C 76 72, 36 72, 28 50 C 26 45, 22 50, 20 60 Z"
            fill={primaryColor}
          />
          
          {/* Central Figure 1 (Left Person) */}
          <circle cx="42" cy="42" r="7" fill={primaryColor} />
          <path
            d="M30 62 C 30 52, 54 52, 54 62"
            stroke={primaryColor}
            strokeWidth="5"
            strokeLinecap="round"
          />
          
          {/* Central Figure 2 (Right Person - slightly smaller) */}
          <circle cx="58" cy="46" r="6" fill={secondaryColor} />
          <path
            d="M48 64 C 48 55, 68 55, 68 64"
            stroke={secondaryColor}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Typography */}
      <div className="flex flex-col">
        <span 
          className="font-extrabold tracking-tight text-xl leading-tight font-sans"
          style={{ color: primaryColor }}
        >
          AMMON
        </span>
        {variant === 'full' && (
          <span 
            className="text-[10px] sm:text-[11px] font-semibold leading-tight tracking-normal whitespace-nowrap"
            style={{ color: subtextColor }}
          >
            Association of Mobile Money Operators of Nigeria
          </span>
        )}
      </div>
    </div>
  );
};
