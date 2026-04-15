import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const PauseIcon: React.FC<IconProps> = ({ className, size = 12 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24">
    <rect x="5" y="4" width="4" height="16" rx="1" />
    <rect x="15" y="4" width="4" height="16" rx="1" />
  </svg>
);

export const PlayIcon: React.FC<IconProps> = ({ className, size = 12 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const HistoryIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const MinimizeIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export const ArrowBackIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

export const StopIcon: React.FC<IconProps> = ({ className, size = 6 }) => (
  <div className={`${className}`} style={{ width: size, height: size, background: 'currentColor', borderRadius: size / 4 }} />
);

export const ResetIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
export const SparklesIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);
