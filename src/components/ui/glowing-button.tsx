import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface GlowingButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const GlowingButton: React.FC<GlowingButtonProps> = ({
  children,
  onClick,
  className,
  disabled = false,
}) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
    onClick?.();
  };

  return (
    <div className="relative flex items-center justify-center">
      <div className="relative flex items-center justify-center group">
        {/* Primary layer - starts top-left, travels to bottom-right */}
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[40px] max-w-[160px] rounded-lg blur-[3px] 
                        before:absolute before:content-[''] before:z-[-2] before:w-[400px] before:h-[400px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[60deg]
                        before:bg-[conic-gradient(rgba(0,0,0,0),#3b82f6_5%,rgba(0,0,0,0)_38%,rgba(0,0,0,0)_50%,#06b6d4_60%,rgba(0,0,0,0)_87%)] before:transition-all before:duration-[6000ms]
                        group-hover:before:rotate-[-120deg] group-focus-within:before:rotate-[420deg] group-focus-within:before:duration-[4000ms]">
        </div>

        {/* Secondary layer - different timing and angle */}
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[38px] max-w-[158px] rounded-lg blur-[3px] 
                        before:absolute before:content-[''] before:z-[-2] before:w-[300px] before:h-[300px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                        before:bg-[conic-gradient(rgba(0,0,0,0),#1e40af,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#0891b2,rgba(0,0,0,0)_60%)] before:transition-all before:duration-[6000ms]
                        group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]">
        </div>

        {/* Tertiary layer - smoother mid-layer */}
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[36px] max-w-[156px] rounded-lg blur-[2px] 
                        before:absolute before:content-[''] before:z-[-2] before:w-[300px] before:h-[300px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[83deg]
                        before:bg-[conic-gradient(rgba(0,0,0,0)_0%,#60a5fa,rgba(0,0,0,0)_8%,rgba(0,0,0,0)_50%,#22d3ee,rgba(0,0,0,0)_58%)] before:brightness-140
                        before:transition-all before:duration-[6000ms] group-hover:before:rotate-[-97deg] group-focus-within:before:rotate-[443deg] group-focus-within:before:duration-[4000ms]">
        </div>

        {/* Inner layer - core glow */}
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[34px] max-w-[154px] rounded-lg blur-[0.5px] 
                        before:absolute before:content-[''] before:z-[-2] before:w-[300px] before:h-[300px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[70deg]
                        before:bg-[conic-gradient(rgba(30,64,175,0.3),#3b82f6_5%,rgba(30,64,175,0.3)_14%,rgba(30,64,175,0.3)_50%,#06b6d4_60%,rgba(30,64,175,0.3)_64%)] before:brightness-130
                        before:transition-all before:duration-[6000ms] group-hover:before:rotate-[-110deg] group-focus-within:before:rotate-[430deg] group-focus-within:before:duration-[4000ms]">
        </div>

        {/* Main button */}
        <button
          onClick={handleClick}
          disabled={disabled}
          className={cn(
            "relative group bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border border-slate-700",
            "text-slate-300 hover:text-white px-4 py-2 rounded-lg",
            "transition-all duration-300 font-medium text-sm",
            "hover:border-sky-500/50 hover:shadow-lg",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "min-w-[150px] h-[34px] flex items-center justify-center",
            isClicked && "animate-active-glow scale-95",
            className
          )}
        >
          {/* Inner highlight */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-sky-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Content */}
          <span className="relative z-10">{children}</span>
        </button>
      </div>
    </div>
  );
};