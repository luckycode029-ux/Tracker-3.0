
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db } from './db';
import { Playlist, Video, VideoNotes, Question, TestResult } from './types';
import { extractPlaylistId, fetchPlaylistDetails } from './services/youtubeService';
import { generateVideoNotes, saveNotesToSupabase, getNotesForPlaylist, deleteNotesFromSupabase } from './services/notesService';
import { onAuthStateChange, signOut, AuthUser, getCurrentUser } from './services/authService';
import { getUserProgress, toggleVideoProgress, syncLocalProgressToSupabase } from './services/userProgress';
import { savePlaylistToSupabase, getUserPlaylists, deletePlaylistFromSupabase, updatePlaylistAccessTime } from './services/playlistService';
import { creditService } from './services/creditService';
import { Sidebar } from './components/Sidebar';
import { PlaylistInput } from './components/PlaylistInput';
import { VideoCard } from './components/VideoCard';
import { GlobalProgress } from './components/GlobalProgress';
import { VideoPlayer } from './components/VideoPlayer';
import { NotesModal } from './components/NotesModal';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { TestModal } from './components/TestModal';
import { testService } from './services/testService';
import { Youtube, History, AlertCircle, Layers, RefreshCw, Sparkles, PanelLeftOpen, LogOut, LogIn, Coins } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingPlaylistUrl, setPendingPlaylistUrl] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(0);

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
  const [testVideo, setTestVideo] = useState<Video | null>(null);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [testMap, setTestMap] = useState<Record<string, Question[]>>({});
  const [testResultsMap, setTestResultsMap] = useState<Record<string, TestResult>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check if this is the first visit
  const isFirstVisit = useMemo(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      localStorage.setItem('hasVisited', 'true');
      return true;
    }
    return false;
  }, []);

  // --- Auth State Management ---
  useEffect(() => {
    const setupAuth = async () => {
      setIsAuthLoading(true);
      try {
        const subscription = onAuthStateChange(async (authUser) => {
          setUser(authUser);
          if (authUser) {
            const currentCredits = await creditService.getCredits().catch(() => 0); // Default to 0 on error
            // Correctly handle possible null return from getCredits
            setCredits(currentCredits ?? 0);
          } else {
            setCredits(0);
          }
          setIsAuthLoading(false);
        });

        const current = await getCurrentUser();
        setUser(current);
        if (current) {
          const currentCredits = await creditService.getCredits().catch(() => 0);
          setCredits(currentCredits ?? 0);
        }
        setIsAuthLoading(false);

        return () => {
          subscription?.unsubscribe();
        };
      } catch (err) {
        console.error('Auth setup error:', err);
        setIsAuthLoading(false);
      }
    };

    setupAuth();
  }, []);

  // Process pending playlist URL after authentication
  useEffect(() => {
    const processPendingPlaylist = async () => {
      if (user && pendingPlaylistUrl) {
        const url = pendingPlaylistUrl;
        setPendingPlaylistUrl(null);
        setShowAuthModal(false);

        const playlistId = extractPlaylistId(url);
        if (!playlistId) {
          setError('Invalid YouTube Playlist URL');
          return;
        }

        const existing = await db.playlists.get(playlistId);
        if (existing) {
          setActivePlaylistId(playlistId);
          setError(null);
          await updatePlaylistAccessTime(user.id, playlistId);
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

          await savePlaylistToSupabase(user.id, playlist);

          const allPlaylists = await db.playlists.orderBy('lastAccessed').reverse().toArray();
          setPlaylists(allPlaylists);
          setActivePlaylistId(playlistId);
        } catch (err: any) {
          setError(err.message || 'Error fetching playlist.');
        } finally {
          setIsLoading(false);
        }
      }
    };

    processPendingPlaylist();
  }, [user, pendingPlaylistUrl]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setPlaylists([]);
      setActivePlaylistId(null);
      setActiveVideos([]);
      setProgressMap({});
      setNotesMap({});
    } catch (err: any) {
      setError(err.message || 'Failed to sign out');
    }
  };

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
        // Load from local DB first for offline support
        const allPlaylists = await db.playlists.orderBy('lastAccessed').reverse().toArray();
        setPlaylists(allPlaylists);

        // If user is logged in, sync with Supabase
        if (user) {
          console.log('🔄 Loading playlists from Supabase for user:', user.id);
          const supabasePlaylists = await getUserPlaylists(user.id);

          if (supabasePlaylists.length > 0) {
            // Sync Supabase playlists to local DB
            await db.transaction('rw', [db.playlists], async () => {
              for (const playlist of supabasePlaylists) {
                const exists = await db.playlists.get(playlist.id);
                if (!exists) {
                  // Add new playlists from Supabase
                  await db.playlists.add(playlist);
                } else {
                  // Update lastAccessed from Supabase
                  await db.playlists.update(playlist.id, {
                    lastAccessed: playlist.lastAccessed
                  });
                }
              }
            });

            // Reload from local DB to show updated list
            const updatedPlaylists = await db.playlists.orderBy('lastAccessed').reverse().toArray();
            setPlaylists(updatedPlaylists);
            console.log('✅ Synced', supabasePlaylists.length, 'playlists from Supabase');
          }
        }
      } catch (err) {
        console.error("Failed to load playlists:", err);
      }
    };

    // Load data when component mounts or user changes
    loadInitialData();
  }, [user]);

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
  const syncActivePlaylist = useCallback(async (id: string, forceRefresh: boolean = false) => {
    setIsSyncing(true);
    try {
      const { playlist, videos } = await fetchPlaylistDetails(id, forceRefresh);
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

      if (forceRefresh) {
        setError(null);
        console.log('✅ Playlist refreshed from YouTube API');
      }
    } catch (err) {
      console.warn("Background sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Load content and user progress
  useEffect(() => {
    if (!activePlaylistId || !user) return;

    const loadContent = async () => {
      setIsLoading(true);
      setCurrentPartIndex(0);
      try {
        // Load videos
        const videos = await db.videos.where('playlistId').equals(activePlaylistId).toArray();
        setActiveVideos(videos.sort((a, b) => a.position - b.position));

        // Load user progress from Supabase
        console.log('🔄 Loading progress from Supabase for user:', user.id);
        const supabaseProgress = await getUserProgress(user.id, activePlaylistId);
        setProgressMap(supabaseProgress);

        // MIGRATION: Check if user has local progress that needs syncing
        const localProgress = await db.progress
          .where('playlistId')
          .equals(activePlaylistId)
          .toArray();

        if (localProgress.length > 0) {
          console.log('📤 Found local progress, syncing to Supabase...');
          await syncLocalProgressToSupabase(
            user.id,
            localProgress.map(p => ({
              videoId: p.videoId,
              playlistId: p.playlistId,
              completed: p.completed
            }))
          );

          // Clear local progress after syncing
          await db.progress.where('playlistId').equals(activePlaylistId).delete();

          // Reload from Supabase to confirm
          const updatedProgress = await getUserProgress(user.id, activePlaylistId);
          setProgressMap(updatedProgress);
        }

        // Load notes from Supabase first
        console.log('📝 Loading notes from Supabase for playlist:', activePlaylistId);
        const supabaseNotes = await getNotesForPlaylist(user.id, activePlaylistId);
        setNotesMap(supabaseNotes);

        // Also load from local DB for offline support
        const localNotes = await db.notes.where('playlistId').equals(activePlaylistId).toArray();
        if (localNotes.length > 0) {
          const nMap: Record<string, VideoNotes> = {};
          localNotes.forEach(n => { nMap[n.videoId] = n; });

          // Merge: Supabase takes priority (newer), but include local ones too
          const mergedNotes = { ...nMap, ...supabaseNotes };
          setNotesMap(mergedNotes);
        }

        // Load test results from Supabase
        console.log('📊 Loading test results from Supabase for playlist:', activePlaylistId);
        const supabaseResults = await testService.getResultsForPlaylist(user.id, activePlaylistId);
        setTestResultsMap(supabaseResults);

        syncActivePlaylist(activePlaylistId);
      } catch (err) {
        console.error('Error loading content:', err);
        setError('Failed to load playlist content');
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [activePlaylistId, user, syncActivePlaylist]);

  const handleSearch = async (url: string) => {
    // Check if user is authenticated
    // If not authenticated AND (not first visit OR pasting playlist link), require authentication
    if (!user) {
      // Store the playlist URL to process after authentication
      setPendingPlaylistUrl(url);
      setAuthView('signup'); // Default to signup view
      setShowAuthModal(true);
      return;
    }

    const playlistId = extractPlaylistId(url);
    if (!playlistId) { setError('Invalid YouTube Playlist URL'); return; }

    // Check credits before proceeding (Cost: 15)
    if (user) {
      // Optimistic check (server will verify too, but good for UI feedback)
      if (credits < 15) {
        setError('Insufficient credits. Search costs 15 credits.');
        return;
      }

      const result = await creditService.deductCredits(15, 'playlist_search');
      if (!result.success) {
        setError(result.message || 'Insufficient credits');
        return;
      }
      setCredits(prev => (result.newCredits !== undefined ? result.newCredits : prev - 15));
    }

    const existing = await db.playlists.get(playlistId);
    if (existing) {
      setActivePlaylistId(playlistId);
      setError(null);
      // Update last accessed time in Supabase
      if (user) {
        await updatePlaylistAccessTime(user.id, playlistId);
      }
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

      // Save playlist to Supabase for cross-device sync
      if (user) {
        await savePlaylistToSupabase(user.id, playlist);
      }

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
    if (!activePlaylistId || !user) {
      console.warn('Cannot toggle: missing playlist or user');
      return;
    }

    const currentStatus = progressMap[videoId] || false;
    const newStatus = !currentStatus;

    console.log('🔄 Toggling video status:', videoId, newStatus);

    // Optimistically update UI
    setProgressMap(prev => ({ ...prev, [videoId]: newStatus }));

    // Save to Supabase
    const success = await toggleVideoProgress(
      user.id,
      videoId,
      activePlaylistId,
      newStatus
    );

    if (!success) {
      // Revert on failure
      setProgressMap(prev => ({ ...prev, [videoId]: currentStatus }));
      setError('Failed to save progress. Please try again.');
      return;
    }

    // Also save to local DB for offline access (optional)
    try {
      await db.progress.put({
        videoId,
        playlistId: activePlaylistId,
        completed: newStatus,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.warn('Failed to save to local DB:', err);
    }
  };

  const handleGenerateNotes = async (forceRegenerate: boolean = false) => {
    if (!notesVideo || !activePlaylistId || !user) return;

    // Check credits (Cost: 10)
    // Only deduct if NOT merely regenerating from cache? 
    // Requirement says "10 for note generation". Usually implies API call. 
    // If it's cached, maybe free? 
    // "generateVideoNotes" handles caching. If forceRegenerate is false and cache exists, it returns cache.
    // The credit deduction should probably happen ONLY if we actually hit the API.
    // However, the `creditService` call happens here in the UI handler. 
    // Simplest approach: Deduct for the *request* to generate.
    // Refinement: The user explicitly clicks "Generate".

    // Let's deduct 10 credits.
    if (credits < 10) {
      setError('Insufficient credits. Note generation costs 10 credits.'); // Show in modal? Modal might need error prop.
      // For now, setting app-level error might be visible if modal doesn't block it, 
      // but let's just alert or use a specific error state for the modal if possible.
      // The modal has `onGenerate` but not an error display prop in `App.tsx` usage.
      // We'll set the main error state, which might show up in the background or we can alert.
      alert('Insufficient credits. You need 10 credits to generate notes.');
      return;
    }

    const result = await creditService.deductCredits(10, 'note_generation');
    if (!result.success) {
      alert(result.message || 'Insufficient credits');
      return;
    }
    setCredits(prev => (result.newCredits !== undefined ? result.newCredits : prev - 10));

    setIsGeneratingNotes(true);
    setError(null);
    try {
      const notesData = await generateVideoNotes(
        notesVideo.id,
        notesVideo.title,
        notesVideo.channelTitle,
        activePlaylistId,
        forceRegenerate
      );

      const newNotes: VideoNotes = {
        videoId: notesVideo.id,
        playlistId: activePlaylistId,
        ...notesData,
        createdAt: Date.now()
      };

      // Save to local DB
      await db.notes.put(newNotes);
      setNotesMap(prev => ({ ...prev, [notesVideo.id]: newNotes }));

      // Save to Supabase for cross-device sync
      await saveNotesToSupabase(user.id, newNotes);
      console.log('✅ Notes saved to Supabase');
    } catch (err: any) {
      console.error('❌ Generation Error:', err);

      // REFUND CREDITS if generation fails
      console.log('🔄 Refunding credits due to failure...');
      const undoResult = await creditService.deductCredits(-10, 'refund_note_generation_failed');
      if (undoResult.success && undoResult.newCredits !== undefined) {
        setCredits(undoResult.newCredits);
      } else {
        setCredits(prev => prev + 10);
      }

      // Check for common "Unexpected end of JSON" error (usually means 404/Function not running)
      if (err.message && err.message.includes('JSON')) {
        setError('Backend function not running. Please ensure you are running "netlify dev" or your API server is active.');
      } else {
        setError(err.message || 'Notes generation failed. Credits have been refunded.');
      }
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  const handleGenerateTest = async () => {
    if (!testVideo || !activePlaylistId || !user) return;

    // Check credits (Cost: 5)
    if (credits < 5) {
      alert('Insufficient credits. Test generation costs 5 credits.');
      return;
    }

    const result = await creditService.deductCredits(5, 'test_generation');
    if (!result.success) {
      alert(result.message || 'Insufficient credits');
      return;
    }
    setCredits(prev => (result.newCredits !== undefined ? result.newCredits : prev - 5));

    setIsGeneratingTest(true);
    setError(null);
    try {
      const questions = await testService.generateTest(
        user.id,
        testVideo.id,
        testVideo.title,
        testVideo.channelTitle,
        activePlaylistId
      );

      setTestMap(prev => ({ ...prev, [testVideo.id]: questions }));
      console.log('✅ Test generated and saved');
    } catch (err: any) {
      console.error('❌ Test Generation Error:', err);

      // REFUND
      const undoResult = await creditService.deductCredits(-5, 'refund_test_generation_failed');
      if (undoResult.success && undoResult.newCredits !== undefined) {
        setCredits(undoResult.newCredits);
      } else {
        setCredits(prev => prev + 5);
      }

      alert(err.message || 'Test generation failed. Credits have been refunded.');
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const handleTakeTest = async (video: Video) => {
    setTestVideo(video);
    if (activePlaylistId && user) {
      // Pre-check if test already exists in cache or Supabase
      const { questions, result } = await testService.getTest(user.id, video.id, activePlaylistId);
      if (questions) {
        setTestMap(prev => ({ ...prev, [video.id]: questions }));
      }
      if (result) {
        setTestResultsMap(prev => ({ ...prev, [video.id]: result }));
      }
    }
  };

  const handleFinishTest = async (score: number, answers: number[]) => {
    if (!testVideo || !activePlaylistId || !user) return;

    let performanceLevel: 'Needs Improvement' | 'Good' | 'Excellent' = 'Needs Improvement';
    if (score >= 8) performanceLevel = 'Excellent';
    else if (score >= 5) performanceLevel = 'Good';

    const result: TestResult = {
      videoId: testVideo.id,
      playlistId: activePlaylistId,
      score,
      totalQuestions: 10,
      userAnswers: answers,
      performanceLevel,
      createdAt: Date.now()
    };

    const success = await testService.saveTestResult(
      user.id,
      testVideo.id,
      activePlaylistId,
      score,
      answers,
      performanceLevel
    );

    if (success) {
      setTestResultsMap(prev => ({
        ...prev,
        [testVideo.id]: result
      }));
    }
  };


  const refreshPlaylist = async () => {
    if (!activePlaylistId) return;
    console.log('🔄 Refreshing playlist from YouTube API...');
    await syncActivePlaylist(activePlaylistId, true);
  };

  const handleRefreshNotes = async () => {
    if (!notesVideo || !activePlaylistId) return;
    console.log('🔄 Regenerating notes...');
    await handleGenerateNotes(true);
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

        // Delete from Supabase as well
        if (user) {
          await deletePlaylistFromSupabase(user.id, id);
          console.log('✅ Playlist deleted from Supabase');
        }
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

  // --- Authentication UI ---
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // --- Auth Modal ---
  const AuthModal = () => {
    if (!showAuthModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">
          {pendingPlaylistUrl && (
            <div className="absolute top-0 left-0 right-0 bg-blue-50 border-b border-blue-200 px-4 py-3 text-sm text-blue-800 z-10">
              <p className="font-medium">Sign up or sign in required</p>
              <p className="text-xs text-blue-600 mt-1">Please authenticate to track your playlist</p>
            </div>
          )}
          <button
            onClick={() => {
              setShowAuthModal(false);
              setPendingPlaylistUrl(null);
            }}
            className={`absolute ${pendingPlaylistUrl ? 'top-3' : 'top-4'} right-4 text-gray-500 hover:text-gray-700 text-2xl z-20`}
          >
            ×
          </button>
          <div className={pendingPlaylistUrl ? 'pt-20' : ''}>
            {authView === 'login' ? (
              <Login onSwitchToSignup={() => setAuthView('signup')} />
            ) : (
              <Signup onSwitchToLogin={() => setAuthView('login')} />
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- Main App UI ---
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
        credits={credits}
      />

      <main className="flex-grow flex flex-col relative overflow-hidden">
        {/* User Profile & Sign Out / Auth Button */}
        <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
          <div className="flex items-center gap-4 bg-zinc-900/50 px-4 py-2 rounded-lg border border-zinc-800">
            {user ? (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">{user.email?.split('@')[0]}</p>
                  <div className="flex items-center justify-end gap-1.5 text-xs text-zinc-400">
                    <Coins className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="font-bold text-yellow-500">{credits}</span>
                    <span>Credits</span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
                  title="Sign out"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setAuthView('login');
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
                title="Sign in or Sign up"
              >
                <LogIn size={16} />
                <span>Sign In</span>
              </button>
            )}
          </div>
          {!user && (
            <p className="text-[10px] text-zinc-500 pr-2 text-right">To track playlist progress, sign up first</p>
          )}
        </div>

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
              onRefresh={refreshPlaylist}
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
                      className={`flex-grow py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 relative group/part ${currentPartIndex === idx
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
                    hasTest={!!testResultsMap[video.id]}
                    canAffordTest={credits >= 5}
                    onToggle={toggleVideoStatus}
                    onWatch={setActiveVideo}
                    onViewNotes={setNotesVideo}
                    onTakeTest={handleTakeTest}
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
          onRefresh={handleRefreshNotes}
        />
      )}

      {/* Auth Modal */}
      <AuthModal />

      {testVideo && (
        <TestModal
          video={testVideo}
          test={testMap[testVideo.id] || null}
          previousResult={testResultsMap[testVideo.id] || null}
          isGenerating={isGeneratingTest}
          onClose={() => setTestVideo(null)}
          onGenerate={handleGenerateTest}
          onSubmit={handleFinishTest}
        />
      )}
    </div>
  );
};

export default App;
