
import React from 'react';
import { CheckCircle, Circle, ExternalLink, Play, FileText, Sparkles } from 'lucide-react';
import { Video } from '../types';

interface VideoCardProps {
  video: Video;
  isCompleted: boolean;
  hasNotes?: boolean;
  onToggle: (videoId: string) => void;
  onWatch: (video: Video) => void;
  onViewNotes: (video: Video) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isCompleted,
  hasNotes = false,
  onToggle,
  onWatch,
  onViewNotes
}) => {
  return (
    <div
      className={`group flex flex-col sm:flex-row items-start gap-4 p-3 rounded-xl transition-all duration-300 border ${isCompleted
          ? 'bg-zinc-900/40 border-green-500/20 opacity-70'
          : 'bg-zinc-900 hover:bg-zinc-800/80 border-transparent hover:border-zinc-700 shadow-xl'
        }`}
    >
      <div
        onClick={() => onWatch(video)}
        className="relative flex-shrink-0 w-full sm:w-40 md:w-48 aspect-video rounded-lg overflow-hidden cursor-pointer group/thumb"
      >
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
          <div className="p-3 bg-red-600 rounded-full shadow-2xl scale-75 group-hover/thumb:scale-100 transition-transform">
            <Play className="w-6 h-6 text-white fill-current" />
          </div>
        </div>
        {isCompleted && (
          <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-lg">
            <CheckCircle className="w-4 h-4" />
          </div>
        )}
        {hasNotes && (
          <div className="absolute bottom-2 left-2 bg-blue-600 text-white px-2 py-0.5 rounded-lg shadow-lg text-[8px] font-black uppercase tracking-widest border border-blue-400/50">
            Notes
          </div>
        )}
      </div>

      <div className="flex-grow min-w-0 py-1 w-full">
        <div className="flex justify-between items-start gap-2">
          <h3
            onClick={() => onWatch(video)}
            className={`font-semibold text-sm md:text-base line-clamp-2 leading-tight cursor-pointer hover:text-red-500 transition-colors ${isCompleted ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}
          >
            {video.title}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewNotes(video);
              }}
              className={`p-1.5 rounded-lg transition-all border ${hasNotes
                  ? 'text-blue-500 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20'
                  : 'text-zinc-500 bg-zinc-800 border-zinc-700 hover:text-white'
                }`}
              title={hasNotes ? "View Notes" : "Generate Notes"}
            >
              <FileText className="w-4 h-4" />
            </button>
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open on YouTube"
              className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <p className="text-xs text-zinc-500 mt-1 font-medium">{video.channelTitle}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => onToggle(video.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${isCompleted
                ? 'bg-green-500/10 text-green-500 border border-green-500/50 hover:bg-green-500/20'
                : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white'
              }`}
          >
            {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
            {isCompleted ? 'Completed' : 'Mark Complete'}
          </button>

          <button
            onClick={() => onWatch(video)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-600/5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Watch Now
          </button>

          <button
            onClick={() => onViewNotes(video)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${hasNotes
                ? 'bg-blue-600/10 text-blue-500 border-blue-600/20 hover:bg-blue-600 hover:text-white'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white'
              }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {hasNotes ? 'Study Guide' : 'Generate Notes'}
          </button>

          {/* 
          <button
            onClick={() => {
              const url = `https://www.youtube.com/watch?v=${video.id}`;
              navigator.clipboard.writeText(url).then(() => {
                window.open('https://notebooklm.google.com', '_blank');
              });
            }}
            className="group/notebook relative p-1 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 bg-zinc-800 hover:bg-black border border-zinc-700 hover:border-zinc-500 shadow-lg"
            title="Copy Link & Open NotebookLM"
          >
            <img 
              src="/notebooklm-logo.svg" 
              alt="NotebookLM" 
              className="w-7 h-7 rounded-full"
            />
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 text-[10px] font-bold text-white rounded opacity-0 group-hover/notebook:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-zinc-700 shadow-xl z-50">
              Open NotebookLM
            </div>
          </button> 
          */}
        </div>
      </div>
    </div>
  );
};
