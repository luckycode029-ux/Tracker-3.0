
import React, { useState, forwardRef } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface PlaylistInputProps {
  onSearch: (url: string) => void;
  isLoading: boolean;
}

export const PlaylistInput = forwardRef<HTMLInputElement, PlaylistInputProps>(
  ({ onSearch, isLoading }, ref) => {
    const [url, setUrl] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (url.trim()) {
        onSearch(url.trim());
      }
    };

    return (
      <form onSubmit={handleSubmit} className="relative group w-full max-w-2xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-zinc-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-red-500 transition-colors" />
          )}
        </div>
        <input
          ref={ref}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          placeholder="Paste YouTube Playlist URL or press / to focus"
          className="block w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-zinc-800 rounded-full text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all text-sm md:text-base backdrop-blur-sm"
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="absolute right-2 top-2 bottom-2 px-6 bg-red-600 hover:bg-red-700 text-white font-medium rounded-full text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Track
        </button>
      </form>
    );
  }
);
