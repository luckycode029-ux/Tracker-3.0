
import React from 'react';
import { Playlist } from '../types';
import { Youtube, Trash2, PlusCircle, ChevronLeft, LayoutGrid, Heart } from 'lucide-react';

interface SidebarProps {
  playlists: Playlist[];
  activePlaylistId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  playlists,
  activePlaylistId,
  onSelect,
  onDelete,
  onNew,
  isOpen,
  onToggle
}) => {

  return (
    <aside
      className={`bg-zinc-950 border-r border-zinc-900 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 pointer-events-none'
        } overflow-hidden`}
      style={{ flexShrink: 0 }}
    >
      <div className="w-80 h-full flex flex-col">
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-xl shadow-lg shadow-red-600/20">
              <Youtube className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tighter text-white">TRACKER</h1>
          </div>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-zinc-900 rounded-lg transition-colors text-zinc-500 hover:text-white"
            title="Hide sidebar (B)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Updated "Add New Playlist" button to match snippet */}
        <div className="px-4 py-4">
          <button
            onClick={onNew}
            className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-zinc-900/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <PlusCircle className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
              <span className="text-zinc-200 font-bold text-lg group-hover:text-white transition-colors">
                Add New Playlist
              </span>
            </div>
            <div className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-600 text-[10px] font-black group-hover:text-zinc-400 transition-colors">
              N
            </div>
          </button>
        </div>

        <div className="px-6 py-2">
          <div className="flex items-center gap-2 text-zinc-600">
            <LayoutGrid className="w-3 h-3" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Your Library</span>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto px-4 pb-4 space-y-1.5 custom-scrollbar">
          {playlists.length === 0 ? (
            <div className="text-center py-16 px-6 opacity-40">
              <Youtube className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-loose">
                Empty Library<br />
                <span className="text-zinc-700 font-bold">Paste a URL to begin</span>
              </p>
            </div>
          ) : (
            playlists.map((playlist) => (
              <div
                key={playlist.id}
                className={`group relative rounded-2xl overflow-hidden transition-all cursor-pointer ${activePlaylistId === playlist.id
                  ? 'bg-zinc-900 ring-1 ring-zinc-800 shadow-2xl'
                  : 'bg-transparent hover:bg-zinc-900/50'
                  }`}
                onClick={() => onSelect(playlist.id)}
              >
                <div className="flex items-center gap-4 p-3">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-900 border border-zinc-800">
                    <img
                      src={playlist.thumbnail}
                      alt={playlist.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className={`font-bold text-sm truncate mb-0.5 ${activePlaylistId === playlist.id ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                      {playlist.title}
                    </h3>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                      {playlist.videoCount} Items
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(playlist.id);
                  }}
                  className="absolute top-1/2 -translate-y-1/2 right-3 p-2 bg-zinc-950/80 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white text-zinc-500 shadow-xl border border-zinc-900"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Section */}
        <div className="p-6 mt-auto border-t border-zinc-900">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-zinc-500">
              <div className="w-0.5 h-3 bg-zinc-700"></div>
              <div className="w-0.5 h-3 bg-zinc-700"></div>
              <div className="w-0.5 h-3 bg-zinc-700 transform -skew-x-12"></div>
              <span className="text-xs font-medium text-zinc-400">v1.0 Premium Beta</span>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
              <span>MADE BY LUCKY</span>
              <Heart className="w-3 h-3 text-red-600 fill-current" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
