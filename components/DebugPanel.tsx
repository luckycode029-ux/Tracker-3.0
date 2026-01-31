
import React, { useState } from 'react';
import { testAPIKeys } from '../services/notesService';
import { Bug, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';

export const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{ groq: boolean } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    try {
      const testResults = await testAPIKeys();
      setResults(testResults);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  // Do not rely on build-time injection of server secrets. The Groq key
  // must remain server-side; show as unavailable in client UI.
  const hasApiKey = false;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-red-600 hover:bg-red-700 rounded-full shadow-2xl z-50 transition-all hover:scale-110 active:scale-95"
        title="Debug Panel"
      >
        <Bug className="w-5 h-5 text-white" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-[#121212] rounded-3xl border border-zinc-800 shadow-2xl z-50 p-6 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-red-500" />
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white">System Diagnostics</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-zinc-500 hover:text-white transition-colors"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-[9px] font-black text-zinc-500 mb-3 uppercase tracking-widest">Environment Status</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
              <span className="text-[10px] font-bold text-zinc-400">Groq API Key</span>
              {hasApiKey ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-[9px] font-black text-zinc-500 mb-3 uppercase tracking-widest">Live API Test</h4>
          <button
            onClick={handleTest}
            disabled={testing}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-600/10"
          >
            {testing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              'Verify Connection'
            )}
          </button>

          {results && (
            <div className="mt-3 p-3 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400">Groq Llama 3.1</span>
                {results.groq ? (
                  <span className="text-green-500 text-[9px] font-black uppercase flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Online
                  </span>
                ) : (
                  <span className="text-red-500 text-[9px] font-black uppercase flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Failed
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800 space-y-2">
          <div className="flex items-center gap-2 text-zinc-500">
            <Info className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Quick Tips</span>
          </div>
          <p className="text-[10px] text-zinc-600 leading-relaxed font-medium">
            If generation fails, check the browser console (F12) for detailed payload errors. Ensure your API key has "Generative Language API" enabled.
          </p>
        </div>
      </div>
    </div>
  );
};
