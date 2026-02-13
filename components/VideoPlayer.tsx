import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [quality, setQuality] = useState<string>(() => {
    try {
      return localStorage.getItem('preferredQuality') || 'default';
    } catch {
      return 'default';
    }
  });

  const qualityOptions = useMemo(() => {
    const base = ['default', ...availableQualities];
    const seen = new Set<string>();
    return base.filter(q => {
      if (seen.has(q)) return false;
      seen.add(q);
      return true;
    });
  }, [availableQualities]);

  const qualityLabel = (q: string) => {
    if (q === 'default') return 'Auto';
    if (q === 'small') return '144p';
    if (q === 'medium') return '360p';
    if (q === 'large') return '480p';
    if (q === 'hd720') return '720p';
    if (q === 'hd1080') return '1080p';
    if (q === 'highres') return 'High';
    return q;
  };

  const applyQuality = (q: string) => {
    if (!playerRef.current) return;
    try {
      const levels: string[] = playerRef.current.getAvailableQualityLevels?.() || [];
      if (q === 'default') {
        playerRef.current.setPlaybackQuality('default');
        return;
      }
      if (levels.includes(q)) {
        playerRef.current.setPlaybackQuality(q);
      }
    } catch {}
  };

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
            try {
              const levels = event.target.getAvailableQualityLevels?.() || [];
              setAvailableQualities(levels);
              if (quality !== 'default' && levels.includes(quality)) {
                event.target.setPlaybackQuality(quality);
              }
            } catch {}
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
            <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-2 py-1">
              <span className="text-xs text-zinc-300 font-bold">Quality</span>
              <select
                value={quality}
                onChange={(e) => {
                  const q = e.target.value;
                  setQuality(q);
                  try { localStorage.setItem('preferredQuality', q); } catch {}
                  applyQuality(q);
                }}
                className="bg-zinc-900 text-zinc-100 text-xs rounded-lg px-2 py-1 border border-zinc-700"
                title="Playback quality"
              >
                {qualityOptions.map((q) => (
                  <option key={q} value={q}>{qualityLabel(q)}</option>
                ))}
              </select>
            </div>
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
