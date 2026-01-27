
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db } from './db';
import { Playlist, Video, VideoNotes } from './types';
import { extractPlaylistId, fetchPlaylistDetails } from './services/youtubeService';
import { generateVideoNotes } from './services/notesService';
import { Sidebar } from './components/Sidebar';
import { PlaylistInput } from './components/PlaylistInput';
import { VideoCard } from './components/VideoCard';
import { GlobalProgress } from './components/GlobalProgress';
import { VideoPlayer } from './components/VideoPlayer';
import { NotesModal } from './components/NotesModal';
import { Youtube, History, AlertCircle, Layers, RefreshCw, Sparkles, PanelLeftOpen } from 'lucide-react';

const App: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [activeVideos, setActiveVideos] = useState<Video[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>({});
  const [notesMap, setNotesMap] = useState<Record<string, VideoNotes>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [notesVideo, setNotesVideo] = useState<Video | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- Derived State (Memoized Values) ---
  
  const playlistSegments = useMemo(() => {
    if (activeVideos.length === 0) return [];
    let numParts = 1;
    if (activeVideos.length > 120) numParts = 4;
    else if (activeVideos.length > 60) numParts = 3;
    else if (activeVideos.length > 20) numParts = 2;

    const itemsPerPart = Math.ceil(activeVideos.length / numParts);
    const segments = [];
    for (let i = 0; i < numParts; i++) {
      segments.push(activeVideos.slice(i * itemsPerPart, (i + 1) * itemsPerPart));
    }
    return segments;
  }, [activeVideos]);

  const activePlaylist = useMemo(() => 
    playlists.find(p => p.id === activePlaylistId), 
    [playlists, activePlaylistId]
  );

  const completedCount = useMemo(() => 
    Object.values(progressMap).filter(Boolean).length, 
    [progressMap]
  );

  const displayedVideos = useMemo(() => 
    playlistSegments[currentPartIndex] || [],
    [playlistSegments, currentPartIndex]
  );

  // --- Initialization ---

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const allPlaylists = await db.playlists.orderBy('lastAccessed').reverse().toArray();
        setPlaylists(allPlaylists);
      } catch (err) {
        console.error("Failed to load playlists:", err);
      }
    };
    loadInitialData();
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      if (key >= '1' && key <= '9') {
        const index = parseInt(key) - 1;
        if (index < playlistSegments.length) setCurrentPartIndex(index);
      }
      if (key === 'n') {
        setActivePlaylistId(null);
        setActiveVideo(null);
        setNotesVideo(null);
      }
      if (key === 'b') {
        setIsSidebarOpen(prev => !prev);
      }
      if (key === '/' && !activePlaylistId) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activePlaylistId, activeVideo, playlistSegments.length]);

  // Sync logic
  const syncActivePlaylist = useCallback(async (id: string) => {
    setIsSyncing(true);
    try {
      const { playlist, videos } = await fetchPlaylistDetails(id);
      await db.transaction('rw', [db.playlists, db.videos], async () => {
        await db.playlists.update(id, { 
          videoCount: playlist.videoCount, 
          title: playlist.title,
          thumbnail: playlist.thumbnail,
          lastAccessed: Date.now() 
        });
        await db.videos.bulkPut(videos.map(v => ({ ...v, playlistId: id })));
      });

      const updatedVideos = await db.videos.where('playlistId').equals(id).toArray();
      setActiveVideos(updatedVideos.sort((a, b) => a.position - b.position));
      const allPlaylists = await db.playlists.orderBy('lastAccessed').reverse().toArray();
      setPlaylists(allPlaylists);
    } catch (err) {
      console.warn("Background sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Load content
  useEffect(() => {
    if (!activePlaylistId) return;

    const loadLocalContent = async () => {
      setIsLoading(true);
      setCurrentPartIndex(0);
      try {
        const videos = await db.videos.where('playlistId').equals(activePlaylistId).toArray();
        const progress = await db.progress.where('playlistId').equals(activePlaylistId).toArray();
        const notes = await db.notes.where('playlistId').equals(activePlaylistId).toArray();
        
        setActiveVideos(videos.sort((a, b) => a.position - b.position));
        
        const pMap: Record<string, boolean> = {};
        progress.forEach(p => { pMap[p.videoId] = p.completed; });
        setProgressMap(pMap);

        const nMap: Record<string, VideoNotes> = {};
        notes.forEach(n => { nMap[n.videoId] = n; });
        setNotesMap(nMap);
        
        syncActivePlaylist(activePlaylistId);
      } catch (err) {
        setError('Failed to load playlist content');
      } finally {
        setIsLoading(false);
      }
    };

    loadLocalContent();
  }, [activePlaylistId, syncActivePlaylist]);

  const handleSearch = async (url: string) => {
    const playlistId = extractPlaylistId(url);
    if (!playlistId) { setError('Invalid YouTube Playlist URL'); return; }

    const existing = await db.playlists.get(playlistId);
    if (existing) {
      setActivePlaylistId(playlistId);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { playlist, videos } = await fetchPlaylistDetails(playlistId);
      await db.transaction('rw', [db.playlists, db.videos], async () => {
        await db.playlists.add(playlist);
        await db.videos.bulkPut(videos.map(v => ({ ...v, playlistId })));
      });
      const allPlaylists = await db.playlists.orderBy('lastAccessed').reverse().toArray();
      setPlaylists(allPlaylists);
      setActivePlaylistId(playlistId);
    } catch (err: any) {
      setError(err.message || 'Error fetching playlist.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVideoStatus = async (videoId: string) => {
    if (!activePlaylistId) return;
    const currentStatus = progressMap[videoId] || false;
    const newStatus = !currentStatus;

    await db.progress.put({
      videoId,
      playlistId: activePlaylistId,
      completed: newStatus,
      updatedAt: Date.now()
    });

    setProgressMap(prev => ({ ...prev, [videoId]: newStatus }));
  };

  const handleGenerateNotes = async () => {
    if (!notesVideo || !activePlaylistId) return;
    
    setIsGeneratingNotes(true);
    setError(null);
    try {
      const notesData = await generateVideoNotes(
        notesVideo.id,
        notesVideo.title,
        notesVideo.channelTitle
      );

      const newNotes: VideoNotes = {
        videoId: notesVideo.id,
        playlistId: activePlaylistId,
        ...notesData,
        createdAt: Date.now()
      };

      await db.notes.put(newNotes);
      setNotesMap(prev => ({ ...prev, [notesVideo.id]: newNotes }));
    } catch (err: any) {
      console.error('❌ Generation Error:', err);
      setError(err.message || 'Notes generation failed.');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  const deletePlaylist = async (id: string) => {
    if (!id) return;
    if (window.confirm('Remove this playlist and all associated progress?')) {
      try {
        setPlaylists(prev => prev.filter(p => p.id !== id));
        if (activePlaylistId === id) {
          setActivePlaylistId(null);
          setActiveVideos([]);
          setProgressMap({});
          setNotesMap({});
          setActiveVideo(null);
        }
        await db.transaction('rw', [db.playlists, db.videos, db.progress, db.notes], async () => {
          await db.playlists.delete(id);
          await db.videos.where('playlistId').equals(id).delete();
          await db.progress.where('playlistId').equals(id).delete();
          await db.notes.where('playlistId').equals(id).delete();
        });
      } catch (err) {
        console.error('Delete failed:', err);
        setError('Could not delete playlist.');
      }
    }
  };

  const handlePlayNext = useCallback(() => {
    if (!activeVideo || !activeVideos.length) return;
    const currentIndex = activeVideos.findIndex(v => v.id === activeVideo.id);
    if (currentIndex !== -1 && currentIndex < activeVideos.length - 1) {
      setActiveVideo(activeVideos[currentIndex + 1]);
    } else {
      setActiveVideo(null);
    }
  }, [activeVideo, activeVideos]);

  return (
    <div className="flex h-screen w-screen bg-[#0f0f0f] text-zinc-100 overflow-hidden relative">
      <Sidebar 
        playlists={playlists}
        activePlaylistId={activePlaylistId}
        onSelect={setActivePlaylistId}
        onDelete={deletePlaylist}
        onNew={() => {
          setActivePlaylistId(null);
          setActiveVideo(null);
          setNotesVideo(null);
        }}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(prev => !prev)}
      />

      <main className="flex-grow flex flex-col relative overflow-hidden">
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="fixed top-6 left-0 z-40 pl-4 pr-3 py-4 bg-zinc-900 border-y border-r border-zinc-800 rounded-r-2xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all shadow-2xl group animate-in slide-in-from-left-4"
            title="Expand Sidebar (B)"
          >
            <PanelLeftOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        )}

        {activePlaylistId && activePlaylist ? (
          <>
            <GlobalProgress 
              playlistTitle={activePlaylist.title}
              completedCount={completedCount}
              totalCount={activeVideos.length}
              onRemove={() => deletePlaylist(activePlaylistId)}
              isSyncing={isSyncing}
            />

            {playlistSegments.length > 1 && (
              <div className="px-6 md:px-12 lg:px-20 pt-6">
                <div className="max-w-5xl mx-auto flex items-center gap-2 bg-zinc-900/50 p-1.5 rounded-[1.5rem] border border-zinc-800/50">
                  <div className="px-4 flex items-center gap-2 text-zinc-500 border-r border-zinc-800/80 mr-1">
                    <Layers className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Parts</span>
                  </div>
                  {playlistSegments.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPartIndex(idx)}
                      className={`flex-grow py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 relative group/part ${
                        currentPartIndex === idx 
                          ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' 
                          : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      Part {idx + 1}
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-900 border border-zinc-800 rounded-lg text-[8px] flex items-center justify-center opacity-0 group-hover/part:opacity-100 transition-opacity font-black">
                        {idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-grow overflow-y-auto px-6 py-6 md:px-12 lg:px-20 scroll-smooth custom-scrollbar">
              <div className="max-w-5xl mx-auto space-y-4">
                {displayedVideos.length === 0 && !isLoading && !isSyncing && (
                  <div className="py-20 text-center space-y-4">
                    <History className="w-16 h-16 text-zinc-700 mx-auto" />
                    <p className="text-zinc-500 font-medium">No videos found.</p>
                  </div>
                )}
                {displayedVideos.map((video) => (
                  <VideoCard 
                    key={video.id}
                    video={video}
                    isCompleted={!!progressMap[video.id]}
                    hasNotes={!!notesMap[video.id]}
                    onToggle={toggleVideoStatus}
                    onWatch={setActiveVideo}
                    onViewNotes={setNotesVideo}
                  />
                ))}
                
                {(isLoading || isSyncing) && activeVideos.length === 0 && (
                   <div className="flex items-center justify-center py-20">
                      <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                   </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center px-6 text-center space-y-12">
            <div className="space-y-4 max-w-xl">
              <div className="inline-flex p-4 bg-red-600/10 rounded-3xl mb-4">
                <Youtube className="w-16 h-16 text-red-600" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">Master Your Course.</h2>
              <p className="text-zinc-500 text-lg md:text-xl font-medium leading-relaxed">
                A professional environment for following YouTube playlists. Watch videos, track progress, and stay synced with the latest uploads.
              </p>
            </div>

            <div className="w-full max-w-2xl px-4">
              <PlaylistInput 
                ref={searchInputRef}
                onSearch={handleSearch} 
                isLoading={isLoading} 
              />
              {error && (
                <div className="mt-6 flex items-center justify-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl pt-12">
              <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 space-y-3">
                <RefreshCw className="w-6 h-6 text-red-600" />
                <h3 className="font-bold text-sm">Real-time Tracking</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed">Playlists stay updated automatically. Never miss a newly added video.</p>
              </div>
              <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 space-y-3">
                <History className="w-6 h-6 text-zinc-400" />
                <h3 className="font-bold text-sm">Theater Mode</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed">Watch content in a distraction-free internal player designed for focus.</p>
              </div>
              <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 space-y-3">
                <Sparkles className="w-6 h-6 text-zinc-400" />
                <h3 className="font-bold text-sm">AI Study Guides</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed">Generate instant summaries and key points for any video in your playlist.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Embedded Player Overlay */}
      {activeVideo && (
        <VideoPlayer 
          video={activeVideo}
          isCompleted={!!progressMap[activeVideo.id]}
          onToggle={toggleVideoStatus}
          onClose={() => setActiveVideo(null)}
          onPlayNext={handlePlayNext}
        />
      )}

      {/* Notes Modal */}
      {notesVideo && (
        <NotesModal
          video={notesVideo}
          notes={notesMap[notesVideo.id] || null}
          isGenerating={isGeneratingNotes}
          onClose={() => setNotesVideo(null)}
          onGenerate={handleGenerateNotes}
        />
      )}
    </div>
  );
};

export default App;
