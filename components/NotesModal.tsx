import React from 'react';
import { Video, VideoNotes } from '../types';
import { X, Sparkles, BookOpen, Lightbulb, Key, Code, FileText } from 'lucide-react';

interface NotesModalProps {
  video: Video;
  notes: VideoNotes | null;
  isGenerating: boolean;
  onClose: () => void;
  onGenerate: () => void;
  onRefresh?: () => void;
}

export const NotesModal: React.FC<NotesModalProps> = ({
  video,
  notes,
  isGenerating,
  onClose,
  onGenerate,
  onRefresh
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl my-8 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-start justify-between gap-4">
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-red-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Study Notes</span>
            </div>
            <h2 className="text-xl font-bold mb-1">{video.title}</h2>
            <p className="text-sm text-zinc-500">{video.channelTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-900 rounded-xl transition-colors text-zinc-400 hover:text-white flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {!notes && !isGenerating && (
            <div className="text-center py-16 space-y-6">
              <div className="inline-flex p-4 bg-red-600/10 rounded-3xl">
                <Sparkles className="w-12 h-12 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Generate Study Notes</h3>
                <p className="text-zinc-500 max-w-md mx-auto">
                  Get clean, revision-friendly notes with key takeaways, important concepts, and must-remember points.
                </p>
              </div>
              <button
                onClick={onGenerate}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-600/20"
              >
                Generate Notes
              </button>
            </div>
          )}

          {isGenerating && (
            <div className="text-center py-16 space-y-4">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-zinc-500 font-medium">Generating your study notes...</p>
            </div>
          )}

          {notes && (
            <div className="space-y-8">
              {/* Video Snapshot */}
              <div className="bg-zinc-900/50 rounded-2xl p-5 border border-zinc-800">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-500 font-medium">Topic:</span>
                    <p className="text-white font-semibold mt-1">{notes.topic}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-medium">Source:</span>
                    <p className="text-white font-semibold mt-1">{notes.source}</p>
                  </div>
                </div>
              </div>

              {/* Key Takeaways */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-bold">Key Takeaways</h3>
                </div>
                <div className="space-y-2.5">
                  {notes.keyTakeaways.map((takeaway, idx) => (
                    <div key={idx} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-red-600 font-bold flex-shrink-0">•</span>
                      <p className="text-zinc-300">{takeaway}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Important Concepts */}
              {notes.concepts && notes.concepts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-zinc-400" />
                    <h3 className="text-lg font-bold">Important Concepts & Keywords</h3>
                  </div>
                  <div className="space-y-3">
                    {notes.concepts.map((concept, idx) => (
                      <div key={idx} className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                        <div className="flex gap-3">
                          <span className="text-red-600 font-bold flex-shrink-0">•</span>
                          <div className="flex-grow">
                            <span className="font-bold text-white">{concept.term}</span>
                            <span className="text-zinc-500"> – </span>
                            <span className="text-zinc-300">{concept.meaning}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Must Remember */}
              {notes.mustRemember && notes.mustRemember.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-bold">Must-Remember Points</h3>
                  </div>
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5 space-y-2.5">
                    {notes.mustRemember.map((point, idx) => (
                      <div key={idx} className="flex gap-3 text-sm leading-relaxed">
                        <span className="text-yellow-500 font-bold flex-shrink-0">•</span>
                        <p className="text-zinc-200 font-medium">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formula / Logic */}
              {notes.formulaOrLogic && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-bold">Formula / Logic / Structure</h3>
                  </div>
                  <div className="bg-zinc-900/50 rounded-2xl p-5 border border-zinc-800 space-y-3">
                    {notes.formulaOrLogic.formula && (
                      <div>
                        <span className="text-zinc-500 font-medium text-sm">Formula:</span>
                        <p className="text-white font-mono text-sm mt-1 bg-zinc-950 p-3 rounded-lg">
                          {notes.formulaOrLogic.formula}
                        </p>
                      </div>
                    )}
                    {notes.formulaOrLogic.structure && (
                      <div>
                        <span className="text-zinc-500 font-medium text-sm">Structure:</span>
                        <p className="text-zinc-300 text-sm mt-1">{notes.formulaOrLogic.structure}</p>
                      </div>
                    )}
                    {notes.formulaOrLogic.condition && (
                      <div>
                        <span className="text-zinc-500 font-medium text-sm">Condition:</span>
                        <p className="text-zinc-300 text-sm mt-1">{notes.formulaOrLogic.condition}</p>
                      </div>
                    )}
                    {notes.formulaOrLogic.whenToUse && (
                      <div>
                        <span className="text-zinc-500 font-medium text-sm">When to Use:</span>
                        <p className="text-zinc-300 text-sm mt-1">{notes.formulaOrLogic.whenToUse}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Final Summary */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-zinc-400" />
                  <h3 className="text-lg font-bold">Final Summary</h3>
                </div>
                <div className="bg-zinc-900/50 rounded-2xl p-5 border border-zinc-800">
                  <p className="text-zinc-300 leading-relaxed">{notes.summary}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {notes && (
          <div className="p-6 border-t border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-600">
              Generated on {new Date(notes.createdAt).toLocaleDateString()}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onRefresh}
                disabled={isGenerating}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Refresh Notes
              </button>
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
