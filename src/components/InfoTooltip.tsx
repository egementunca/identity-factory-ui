'use client';

import { useState, useEffect, useRef } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
}

export default function InfoTooltip({ content }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block ml-1" ref={tooltipRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 rounded-full transition-colors ${
          isOpen
            ? 'text-blue-400 bg-blue-500/10'
            : 'text-slate-400 hover:text-blue-400 hover:bg-slate-700/50'
        }`}
        type="button"
        aria-label="More info"
      >
        <Info size={14} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-64 p-3 mt-2 text-sm text-slate-100 bg-slate-800 rounded-lg shadow-xl border border-slate-700 -left-28 sm:left-auto">
          <div className="relative">
            {/* Arrow */}
            <div className="absolute -top-[17px] left-[calc(50%-6px)] border-8 border-transparent border-b-slate-700" />
            <div className="absolute -top-[16px] left-[calc(50%-6px)] border-8 border-transparent border-b-slate-800" />

            <p className="leading-relaxed text-sm/relaxed text-slate-200">
              {content}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
