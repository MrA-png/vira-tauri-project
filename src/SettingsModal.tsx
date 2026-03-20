import React, { useState, useRef, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGlassy: boolean;
  onToggleGlassy: () => void;
  isTranslating: boolean;
  onToggleTranslating: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isGlassy,
  onToggleGlassy,
  isTranslating,
  onToggleTranslating,
}) => {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Re-center or keep last position
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      dragRef.current = {
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      };
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragRef.current) {
        setPosition({
          x: e.clientX - dragRef.current.offsetX,
          y: e.clientY - dragRef.current.offsetY,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <div 
      ref={modalRef}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      className="w-[280px] glass-card rounded-2xl border border-white/20 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 pointer-events-auto"
    >
      {/* Modal Header - Draggable Area */}
      <div 
        onMouseDown={handleMouseDown}
        className="h-11 shrink-0 bg-white/5 border-b border-white/10 flex items-center justify-between px-4 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center space-x-2.5 pointer-events-none">
          <div className="p-1 bg-sky-500/10 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-100">Vira Config</span>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Modal Body */}
      <div className="flex-1 p-4 space-y-5">
        {/* Transparent Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-slate-100 uppercase tracking-wider">Glass Mode</span>
            <span className="text-[9px] text-slate-500">Toggle premium glass effect</span>
          </div>
          <button 
            onClick={onToggleGlassy}
            className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border transition-all duration-500 group relative overflow-hidden ${
              isGlassy 
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' 
                : 'bg-white/5 border-white/10 text-slate-500'
            }`}
          >
            <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors duration-300 ${isGlassy ? 'text-sky-400' : 'text-slate-600'}`}>
              {isGlassy ? 'ON' : 'OFF'}
            </span>
            <div className={`w-3.5 h-3.5 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,0,0,0.2)] ${
              isGlassy ? 'bg-sky-500 shadow-sky-500/50' : 'bg-slate-700'
            }`} />
          </button>
        </div>

        {/* Translation Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-slate-100 uppercase tracking-wider">Translation</span>
            <span className="text-[9px] text-slate-500">English to Indonesia</span>
          </div>
          <button 
            onClick={onToggleTranslating}
            className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border transition-all duration-500 group relative overflow-hidden ${
              isTranslating 
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' 
                : 'bg-white/5 border-white/10 text-slate-500'
            }`}
          >
            <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors duration-300 ${isTranslating ? 'text-sky-400' : 'text-slate-600'}`}>
              {isTranslating ? 'ON' : 'OFF'}
            </span>
            <div className={`w-3.5 h-3.5 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,0,0,0.2)] ${
              isTranslating ? 'bg-sky-500 shadow-sky-500/50' : 'bg-slate-700'
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
