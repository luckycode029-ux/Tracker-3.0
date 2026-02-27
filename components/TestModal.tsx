import React, { useState, useEffect } from 'react';
import { Video, Question, TestResult } from '../types';
import { X, ClipboardList, CheckCircle, XCircle, Award, ArrowRight, ArrowLeft, RefreshCw, Sparkles, Brain, Loader2 } from 'lucide-react';

interface TestModalProps {
    video: Video;
    test: Question[] | null;
    previousResult: TestResult | null;
    isGenerating: boolean;
    onClose: () => void;
    onGenerate: () => void;
    onSubmit: (score: number, answers: number[]) => void;
}

export const TestModal: React.FC<TestModalProps> = ({
    video,
    test,
    previousResult,
    isGenerating,
    onClose,
    onGenerate,
    onSubmit
}) => {
    const [currentStep, setCurrentStep] = useState<'intro' | 'active' | 'results'>('intro');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<number[]>([]);

    useEffect(() => {
        if (test && isGenerating) {
            // If we were generating and now we have a test, move to active if user was waiting
            // Actually, usually users click generate then start.
        }
    }, [test, isGenerating]);

    const handleStart = () => {
        if (!test) return;
        setCurrentStep('active');
        setCurrentQuestionIndex(0);
        setUserAnswers(new Array(test.length).fill(-1));
    };

    const handleOptionSelect = (optionIndex: number) => {
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = optionIndex;
        setUserAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < (test?.length || 10) - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            handleFinish();
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleFinish = () => {
        if (!test) return;
        let score = 0;
        test.forEach((q, idx) => {
            if (userAnswers[idx] === q.correctAnswer) {
                score++;
            }
        });
        onSubmit(score, userAnswers);
        setCurrentStep('results');
    };

    const progress = test ? ((currentQuestionIndex + 1) / test.length) * 100 : 0;

    const getPerformanceData = (score: number) => {
        if (score >= 8) return {
            label: 'Excellent',
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/20',
            message: 'Great work. You clearly understood the lecture.'
        };
        if (score >= 5) return {
            label: 'Good',
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20',
            message: 'Solid understanding. Try reviewing weak points.'
        };
        return {
            label: 'Needs Improvement',
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/20',
            message: 'Review the lecture and notes carefully.'
        };
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-md">
            <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden ring-1 ring-white/5">
                {/* Header */}
                <div className="px-8 py-6 border-b border-zinc-900 flex items-center justify-between gap-4 bg-zinc-900/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-600/10 rounded-xl border border-purple-600/20">
                            <Brain className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">Lecture Test</h2>
                            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider truncate max-w-[250px]">{video.title}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">

                    {/* INTRO STEP */}
                    {currentStep === 'intro' && (
                        <div className="text-center py-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {!test && !isGenerating && (
                                <div className="space-y-8">
                                    <div className="relative inline-flex mb-4">
                                        <div className="absolute inset-0 bg-purple-600/20 blur-3xl rounded-full"></div>
                                        <div className="relative p-8 bg-zinc-900/50 rounded-full border border-purple-600/20">
                                            <Sparkles className="w-16 h-16 text-purple-500 animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-3xl font-black tracking-tight text-white italic">Ready to level up?</h3>
                                        <p className="text-zinc-400 max-w-md mx-auto leading-relaxed text-sm">
                                            Generate a custom 10-question MCQ test to verify your mastery of this lecture.
                                        </p>
                                    </div>
                                    <div className="pt-4">
                                        <button
                                            onClick={onGenerate}
                                            className="group relative px-12 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-purple-600/20 flex items-center justify-center gap-2 mx-auto overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                            GENERATE TEST (5 credits)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isGenerating && (
                                <div className="py-12 space-y-6">
                                    <div className="relative w-24 h-24 mx-auto">
                                        <div className="absolute inset-0 border-t-4 border-purple-600 rounded-full animate-spin"></div>
                                        <div className="absolute inset-0 m-auto w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center">
                                            <Brain className="w-8 h-8 text-purple-500" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xl font-bold text-white">Generating Test...</p>
                                        <p className="text-zinc-500 text-sm animate-pulse">Our AI is analyzing the transcript to craft your challenges.</p>
                                    </div>
                                </div>
                            )}

                            {test && !isGenerating && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-zinc-900/30 p-6 rounded-[2rem] border border-zinc-800 text-center">
                                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Status</p>
                                            <p className="text-xl font-black text-green-500 uppercase">Ready</p>
                                        </div>
                                        <div className="bg-zinc-900/30 p-6 rounded-[2rem] border border-zinc-800 text-center">
                                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Difficulty</p>
                                            <p className="text-xl font-black text-amber-500 uppercase">Medium</p>
                                        </div>
                                    </div>

                                    {previousResult && (
                                        <div className={`border rounded-[2rem] p-5 flex items-center justify-between ${getPerformanceData(previousResult.score).bgColor} ${getPerformanceData(previousResult.score).borderColor}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl ${getPerformanceData(previousResult.score).borderColor} border bg-zinc-950/50`}>
                                                    <Award className={`w-6 h-6 ${getPerformanceData(previousResult.score).color}`} />
                                                </div>
                                                <div className="text-left">
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${getPerformanceData(previousResult.score).color}`}>Previous Attempt</p>
                                                    <p className="text-lg font-black text-white">{previousResult.score} / 10</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase">{getPerformanceData(previousResult.score).label}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 space-y-4">
                                        <button
                                            onClick={handleStart}
                                            className="w-full py-5 bg-white text-black hover:bg-zinc-200 rounded-[1.5rem] font-black text-sm transition-all shadow-2xl flex items-center justify-center gap-2 group"
                                        >
                                            {previousResult ? 'RETAKE FOR FREE' : 'START TEST'}
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                        <button
                                            onClick={onGenerate}
                                            className="w-full py-4 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-[1.5rem] font-bold text-xs transition-all border border-zinc-800 flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            Regenerate Questions (5 Credits)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ACTIVE TEST STEP */}
                    {currentStep === 'active' && test && (
                        <div className="space-y-10 animate-in fade-in duration-500">
                            {/* Progress & Header */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em]">
                                            Knowledge Check
                                        </p>
                                        <h4 className="text-sm font-bold text-zinc-400">Question {currentQuestionIndex + 1} of {test.length}</h4>
                                    </div>
                                    <span className="px-3 py-1 bg-zinc-900 rounded-full text-[10px] font-black text-white border border-zinc-800">
                                        {Math.round(progress)}%
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-600 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(147,51,234,0.5)]"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Question Card */}
                            <div className="bg-zinc-900/10 border border-zinc-800/50 rounded-[2.5rem] p-2">
                                <div className="bg-zinc-950 p-8 rounded-[2.2rem] space-y-8 shadow-inner">
                                    <h3 className="text-xl md:text-2xl font-bold leading-snug text-white tracking-tight">
                                        {test[currentQuestionIndex].question}
                                    </h3>

                                    <div className="space-y-3">
                                        {test[currentQuestionIndex].options.map((option, idx) => {
                                            const isSelected = userAnswers[currentQuestionIndex] === idx;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleOptionSelect(idx)}
                                                    className={`w-full p-5 rounded-[1.2rem] text-left transition-all border-2 flex items-center gap-4 group relative overflow-hidden ${isSelected
                                                        ? 'bg-purple-600/5 border-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.05)]'
                                                        : 'bg-zinc-900/20 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/40'
                                                        }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected
                                                        ? 'border-purple-600 bg-purple-600 scale-110 shadow-lg shadow-purple-600/50'
                                                        : 'border-zinc-700 group-hover:border-zinc-500'
                                                        }`}>
                                                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                                                    </div>
                                                    <span className={`font-semibold text-sm transition-colors ${isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                                                        {option}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center justify-between gap-4">
                                <button
                                    onClick={handlePrevious}
                                    disabled={currentQuestionIndex === 0}
                                    className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm text-zinc-500 hover:text-white disabled:opacity-0 transition-all"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    PREVIOUS
                                </button>

                                <button
                                    onClick={handleNext}
                                    disabled={userAnswers[currentQuestionIndex] === -1}
                                    className={`flex-grow sm:flex-grow-0 px-10 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${userAnswers[currentQuestionIndex] === -1
                                        ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed opacity-50'
                                        : 'bg-purple-600 text-white hover:bg-purple-500 shadow-xl shadow-purple-600/20 active:scale-95'
                                        }`}
                                >
                                    {currentQuestionIndex === test.length - 1 ? 'SUBMIT ANSWERS' : 'NEXT QUESTION'}
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* RESULTS STEP */}
                    {currentStep === 'results' && test && (
                        <div className="space-y-10 animate-in fade-in zoom-in duration-500">
                            {/* Score Display */}
                            <div className="text-center space-y-6">
                                <div className="inline-flex relative">
                                    <div className="absolute inset-0 bg-yellow-400/20 blur-[50px] rounded-full animate-pulse"></div>
                                    <div className="relative p-10 bg-zinc-900/50 rounded-full border border-zinc-800 shadow-2xl">
                                        <Award className="w-20 h-20 text-yellow-500" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-4xl font-black text-white tracking-tight italic">Test Finalized!</h3>
                                    <p className="text-zinc-500 font-medium">You've completed the evaluation.</p>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-12 py-8 px-6 bg-zinc-900/30 rounded-[2.5rem] border border-zinc-800/50">
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Score</p>
                                        <p className="text-6xl font-black text-white">
                                            {userAnswers.reduce((acc, ans, idx) => acc + (ans === test[idx].correctAnswer ? 1 : 0), 0)}
                                            <span className="text-2xl text-zinc-600">/10</span>
                                        </p>
                                    </div>
                                    <div className="hidden sm:block h-16 w-px bg-zinc-800"></div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Performance</p>
                                        {(() => {
                                            const score = userAnswers.reduce((acc, ans, idx) => acc + (ans === test[idx].correctAnswer ? 1 : 0), 0);
                                            const data = getPerformanceData(score);
                                            return (
                                                <div className="space-y-1">
                                                    <p className={`text-3xl font-black italic ${data.color}`}>{data.label}</p>
                                                    <p className="text-xs text-zinc-400 max-w-[180px] leading-snug">{data.message}</p>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="pt-4 space-y-4">
                                <button
                                    onClick={() => {
                                        setCurrentStep('intro');
                                        onGenerate();
                                    }}
                                    className="w-full py-5 bg-white text-black hover:bg-zinc-200 rounded-3xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    RETAKE TEST (5 credits)
                                </button>

                                <button
                                    onClick={onClose}
                                    className="w-full py-4 text-zinc-500 hover:text-white font-bold text-sm transition-all"
                                >
                                    RETURN TO LESSONS
                                </button>
                            </div>

                            {/* Detailed Question Review */}
                            <div className="space-y-6 pt-10 border-t border-zinc-900">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-zinc-900 rounded-lg">
                                        <ClipboardList className="w-5 h-5 text-zinc-500" />
                                    </div>
                                    <h4 className="text-xl font-bold text-white">Review Your Answers</h4>
                                </div>

                                <div className="space-y-4">
                                    {test.map((q, idx) => {
                                        const isCorrect = userAnswers[idx] === q.correctAnswer;
                                        return (
                                            <div key={idx} className={`p-6 rounded-[2rem] border transition-all ${isCorrect ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                                                <div className="flex justify-between gap-4 mb-5">
                                                    <p className="font-bold text-white text-base leading-relaxed">
                                                        <span className="text-zinc-500 mr-3 text-sm font-black italic">#{idx + 1}</span>
                                                        {q.question}
                                                    </p>
                                                    {isCorrect ? (
                                                        <div className="shrink-0 p-1.5 bg-green-500/20 rounded-full h-fit">
                                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                                        </div>
                                                    ) : (
                                                        <div className="shrink-0 p-1.5 bg-red-500/20 rounded-full h-fit">
                                                            <XCircle className="w-5 h-5 text-red-500" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 gap-2.5 mb-5">
                                                    {q.options.map((option, optIdx) => {
                                                        const isUserSelection = userAnswers[idx] === optIdx;
                                                        const isCorrectOption = q.correctAnswer === optIdx;

                                                        let stateClasses = 'bg-zinc-950/50 border-zinc-900 text-zinc-500';
                                                        if (isCorrectOption) stateClasses = 'bg-green-500/10 border-green-500/30 text-green-400';
                                                        else if (isUserSelection && !isCorrectOption) stateClasses = 'bg-red-500/10 border-red-500/30 text-red-400';

                                                        return (
                                                            <div key={optIdx} className={`px-4 py-3 rounded-xl border text-sm flex items-center justify-between ${stateClasses}`}>
                                                                <span className="font-medium">{option}</span>
                                                                {isCorrectOption && <CheckCircle className="w-3.5 h-3.5" />}
                                                                {isUserSelection && !isCorrectOption && <XCircle className="w-3.5 h-3.5" />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-900/50">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Sparkles className="w-3 h-3 text-purple-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Expert Explanation</span>
                                                    </div>
                                                    <p className="text-xs text-zinc-400 leading-relaxed italic">{q.explanation}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
