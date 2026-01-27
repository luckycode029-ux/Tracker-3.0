
import React from 'react';
import { Trophy, Trash2, RefreshCw, Clock } from 'lucide-react';

interface GlobalProgressProps {
  completedCount: number;
  totalCount: number;
  playlistTitle: string;
  onRemove: () => void;
  isSyncing?: boolean;
}

export const GlobalProgress: React.FC<GlobalProgressProps> = ({ 
  completedCount, 
  totalCount,
  playlistTitle,
  onRemove,
  isSyncing = false
}) => {
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  return (
    <div className="sticky top-0 z-30 bg-[#0f0f0f]/80 backdrop-blur-xl border-b border-zinc-800 py-4 px-6 md:px-8 shadow-2xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="min-w-0 flex-grow">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-white truncate">{playlistTitle}</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={onRemove}
                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                title="Remove Playlist"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              {isSyncing && (
                <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 rounded-md">
                  <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Syncing</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-sm text-zinc-500 font-medium">
              {completedCount} of {totalCount} videos watched
            </p>
            <div className="flex items-center gap-1.5 text-zinc-600 text-[10px] font-bold uppercase">
              <Clock className="w-3 h-3" />
              <span>Live tracking active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Progress</span>
            <span className="text-xl font-black text-white">{percentage}%</span>
          </div>
          
          <div className="relative w-14 h-14 md:w-16 md:h-16">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="42%"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="12%"
                className="text-zinc-800"
              />
              <circle
                cx="50%"
                cy="50%"
                r="42%"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="12%"
                strokeDasharray="100 100"
                strokeDashoffset={100 - percentage}
                strokeLinecap="round"
                className={`transition-all duration-700 ease-out ${
                  percentage === 100 ? 'text-green-500' : 'text-red-600'
                }`}
                style={{ strokeDasharray: '263.89', strokeDashoffset: 263.89 - (263.89 * percentage) / 100 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {percentage === 100 ? (
                <Trophy className="w-5 h-5 text-green-500 animate-bounce" />
              ) : (
                <span className="text-[10px] md:text-xs font-bold text-white">{percentage}%</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
