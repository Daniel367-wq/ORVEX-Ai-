import React from 'react';

interface OrvexLogoProps {
  environmentLabel?: string;
}

export const OrvexLogo: React.FC<OrvexLogoProps> = ({ environmentLabel }) => {
  return (
    <div className="flex items-center gap-3 select-none">
      {/* Minimalist open circle with champagne gold dot */}
      <svg
        width="30"
        height="30"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <path
          d="M23.5 9.2A10.5 10.5 0 1 1 16 5.5"
          stroke="#F5F5F3"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <circle cx="22.5" cy="8.2" r="2.2" fill="#D6B36A" />
      </svg>

      <div className="leading-none">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[16px] font-bold tracking-[0.18em] text-[#F5F5F3]">
            ORVEX
          </span>
          <span className="text-[15px] font-semibold tracking-[0.12em] text-[#D6B36A]">
            AI
          </span>
        </div>
        {environmentLabel && (
          <span className="block text-[9.5px] font-medium tracking-[0.22em] uppercase text-[#999895] mt-1">
            {environmentLabel}
          </span>
        )}
      </div>
    </div>
  );
};
