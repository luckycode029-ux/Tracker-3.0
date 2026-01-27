import React, { useEffect, useRef } from 'react';
import { Video } from '../types';
import { X, Check, Circle, SkipForward } from 'lucide-react';

interface VideoPlayerProps {
  video: Video;
  isCompleted: boolean;
  onToggle: (videoId: string) => void;
  onClose: () => void;
  onPlayNext: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  isCompleted,
  onToggle,
  onClose,
  onPlayNext
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 100);
        return;
      }

      // Destroy existing player if it exists
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player('youtube-player', {
        videoId: video.id,
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0,
          fs: 1,
          playsinline: 1
        },
        events: {
          onReady: (event: any) => {
            event.target.playVideo();
          },
          onError: (event: any) => {
            console.error('YouTube Player Error:', event.data);
          }
        }
      });
    };

    initPlayer();

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [video.id]); // Re-initialize when video.id changes

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-grow">
            <div className="px-3 py-1 bg-red-600 rounded-lg">
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Theater</span>
            </div>
            <div className="min-w-0 flex-grow">
              <h2 className="text-sm font-bold truncate">{video.title}</h2>
              <p className="text-xs text-zinc-500">{video.channelTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onToggle(video.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                isCompleted
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              {isCompleted ? 'Watched' : 'Mark Watched'}
            </button>

            <button
              onClick={onPlayNext}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-sm transition-all"
            >
              <SkipForward className="w-4 h-4" />
              Next
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Video Player */}
      <div className="flex-grow flex items-center justify-center p-6" ref={containerRef}>
        <div className="w-full max-w-7xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
          <div id="youtube-player" className="w-full h-full"></div>
        </div>
      </div>
    </div>
  );
};