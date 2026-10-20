import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewsApi } from '../api/client';
import useVoice from '../hooks/useVoice';
import AudioWaveform from '../components/AudioWaveform';
import TranscriptPanel from '../components/TranscriptPanel';
import {
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Keyboard,
  Sparkles,
  Volume2,
  VolumeX,
  AlertCircle,
  Clock,
  Flame,
  ShieldAlert,
  Layers,
  CheckCircle,
} from 'lucide-react';

export const InterviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null);

  // Fallback typed input
  const [typedInput, setTypedInput] = useState('');
  const [showTypedInput, setShowTypedInput] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Voice hook
  const {
    isSupported,
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
    speak,
    stopSpeaking,
  } = useVoice();

  const hasGreetedRef = useRef(false);

  // Call duration timer
  useEffect(() => {
    if (isEnded || loadingSession) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isEnded, loadingSession]);

  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Load session
  useEffect(() => {
    const loadInterview = async () => {
      try {
        setLoadingSession(true);
        setError(null);
        const data = await interviewsApi.getInterview(id);
        setSession(data);
        setMessages(data.messages || []);

        // Speak opening greeting once loaded
        if (!hasGreetedRef.current && data.messages && data.messages.length > 0) {
          hasGreetedRef.current = true;
          const firstMsg = data.messages[0];
          if (firstMsg.role === 'interviewer') {
            // Small timeout to allow user interaction context
            setTimeout(() => {
              if (!isMuted) {
                speak(firstMsg.text);
              }
            }, 600);
          }
        }
      } catch (err) {
        console.error('Failed to load interview session:', err);
        setError('Interview session could not be found or has expired.');
      } finally {
        setLoadingSession(false);
      }
    };

    if (id) {
      loadInterview();
    }
  }, [id, speak, isMuted]);

  // Handle submitting candidate answer turn
  const handleSendAnswer = async (textToSend) => {
    const answer = (textToSend || transcript).trim();
    if (!answer || isThinking) return;

    // Stop listening before sending
    stopListening();
    setIsThinking(true);
    resetTranscript();
    setTypedInput('');
    setShowTypedInput(false);

    // Optimistic UI update: append candidate answer immediately
    const tempCandidateMsg = {
      role: 'candidate',
      text: answer,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempCandidateMsg]);

    try {
      const response = await interviewsApi.sendTurn(id, answer);
      setMessages(response.messages);

      // Play AI voice answer
      if (!isMuted) {
        speak(response.reply);
      }
    } catch (err) {
      console.error('Error during interview turn:', err);
      const errMsg =
        err.response?.data?.detail || err.message || 'Failed to process answer with AI service.';
      setError(errMsg);
    } finally {
      setIsThinking(false);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      if (isSpeaking) {
        stopSpeaking();
      }
      startListening();
    }
  };

  const handleEndInterview = () => {
    stopListening();
    stopSpeaking();
    setIsEnded(true);
  };

  // Determine avatar visual state
  const getAvatarState = () => {
    if (isSpeaking) return 'speaking';
    if (isThinking) return 'thinking';
    if (isListening) return 'listening';
    return 'idle';
  };

  const company = session?.company_snapshot || {};
  const compName = company.name || 'AI Interviewer';

  if (loadingSession) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-4 animate-pulse">
          <Sparkles className="w-7 h-7 animate-spin duration-1000" />
        </div>
        <p className="text-sm font-semibold text-white tracking-wide">
          Connecting to AI Interview Session...
        </p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4">
        <div className="glass-panel rounded-3xl p-8 max-w-md w-full text-center border border-accent-rose/30">
          <AlertCircle className="w-10 h-10 text-accent-rose mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Session Error</h2>
          <p className="text-xs text-dark-muted mb-6">{error}</p>
          <button
            onClick={() => navigate('/companies')}
            className="px-5 py-2.5 rounded-xl bg-dark-elevated text-white font-semibold text-xs border border-dark-border hover:bg-dark-border transition-colors"
          >
            Back to Companies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-dark-bg relative overflow-hidden">
      {/* Top Header Bar */}
      <div className="border-b border-dark-border/80 bg-dark-card/40 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between z-20">
        {/* Left: Company & Difficulty Details */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dark-elevated border border-dark-border flex items-center justify-center font-bold text-white text-sm">
            {company.initial || compName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white">{compName}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-brand-500/15 text-brand-300 border border-brand-500/30">
                {company.difficulty_level || 'Medium'} Tier
              </span>
            </div>
            <p className="text-[11px] text-dark-muted hidden sm:block">
              {company.interview_style || 'Technical & Behavioral Evaluation'}
            </p>
          </div>
        </div>

        {/* Center: Live Timer */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-elevated border border-dark-border text-xs font-mono font-medium text-gray-300">
          <Clock className="w-3.5 h-3.5 text-brand-400" />
          <span>{formatTimer(elapsedSeconds)}</span>
        </div>

        {/* Right: Sound toggle & End Call CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              if (!isMuted) stopSpeaking();
              setIsMuted(!isMuted);
            }}
            title={isMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
            className={`p-2 rounded-xl border text-xs font-medium transition-colors ${
              isMuted
                ? 'bg-accent-rose/15 text-accent-rose border-accent-rose/30'
                : 'bg-dark-elevated text-dark-muted hover:text-white border-dark-border'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleEndInterview}
            className="px-3.5 py-2 rounded-xl bg-accent-rose/15 hover:bg-accent-rose/25 text-rose-300 font-bold text-xs border border-accent-rose/30 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">End Interview</span>
          </button>
        </div>
      </div>

      {/* Main Call Stage */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Left Column: Call Stage & Mic Controls (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between glass-panel rounded-3xl p-6 border border-dark-border/80 shadow-2xl relative min-h-[480px]">
          {/* Top subtle indicators */}
          <div className="flex items-center justify-between text-[11px] text-dark-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
              Live Secure Channel
            </span>
            <span className="font-mono">{company.industry}</span>
          </div>

          {/* Center Stage: Audio Waveform & AI Avatar */}
          <div className="my-auto py-4">
            <AudioWaveform state={getAvatarState()} companyName={compName} />

            {/* Error notifications */}
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-accent-rose/10 border border-accent-rose/30 text-xs text-rose-300 text-center max-w-md mx-auto">
                {error}
              </div>
            )}
            {voiceError && (
              <div className="mt-4 p-3 rounded-xl bg-accent-amber/10 border border-accent-amber/30 text-xs text-amber-300 text-center max-w-md mx-auto">
                {voiceError}
              </div>
            )}
          </div>

          {/* Bottom Live Controls */}
          <div className="flex flex-col items-center gap-3 w-full max-w-lg mx-auto">
            {/* Live speech preview preview bubble if user is speaking */}
            {(transcript || interimTranscript) && (
              <div className="w-full p-3 rounded-2xl bg-dark-elevated/90 border border-brand-500/30 text-xs text-gray-200 text-left shadow-lg">
                <div className="flex items-center justify-between mb-1 text-[10px] text-brand-400 font-semibold uppercase">
                  <span>Your live response:</span>
                  <button
                    onClick={resetTranscript}
                    className="text-dark-muted hover:text-white underline lowercase"
                  >
                    clear
                  </button>
                </div>
                <p className="line-clamp-3">
                  {transcript} <span className="text-accent-cyan italic">{interimTranscript}</span>
                </p>
              </div>
            )}

            {/* Controls Bar */}
            <div className="flex items-center gap-4 w-full justify-center">
              {/* Fallback Keyboard / Typed Input Toggle */}
              <button
                onClick={() => setShowTypedInput(!showTypedInput)}
                title="Toggle Typed Answer Fallback"
                className={`p-3.5 rounded-2xl border transition-colors ${
                  showTypedInput
                    ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                    : 'bg-dark-elevated border-dark-border text-dark-muted hover:text-white'
                }`}
              >
                <Keyboard className="w-5 h-5" />
              </button>

              {/* Main Microphone Action Button */}
              <button
                onClick={toggleMic}
                disabled={isSpeaking || isThinking}
                className={`h-16 px-6 rounded-2xl font-bold text-xs flex items-center justify-center gap-3 transition-all duration-300 shadow-xl ${
                  isListening
                    ? 'bg-accent-rose hover:bg-rose-600 text-white shadow-rose-500/30 scale-105 animate-pulse'
                    : 'bg-brand-500 hover:bg-brand-400 text-dark-bg shadow-brand-500/25 hover:scale-105'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-5 h-5" />
                    <span>Mute Microphone</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    <span>Click to Speak Answer</span>
                  </>
                )}
              </button>

              {/* Send Answer CTA (if transcript exists) */}
              {transcript && (
                <button
                  onClick={() => handleSendAnswer(transcript)}
                  disabled={isThinking}
                  className="p-3.5 rounded-2xl bg-brand-500 hover:bg-brand-400 text-dark-bg font-bold shadow-lg shadow-brand-500/20 transition-all hover:scale-105 disabled:opacity-50"
                  title="Send Answer to AI"
                >
                  <Send className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Typed Input Fallback Drawer */}
            {showTypedInput && (
              <div className="w-full mt-3 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <input
                  type="text"
                  placeholder="Type your interview answer here if mic is unavailable..."
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendAnswer(typedInput);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border focus:border-brand-500 focus:outline-none text-xs text-white placeholder-dark-muted"
                />
                <button
                  onClick={() => handleSendAnswer(typedInput)}
                  disabled={!typedInput.trim() || isThinking}
                  className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-bg font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-40"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Full Conversation Transcript (5 cols) */}
        <div className="lg:col-span-5 h-[520px] lg:h-auto">
          <TranscriptPanel
            messages={messages}
            interimTranscript={interimTranscript}
            companyName={compName}
          />
        </div>
      </div>

      {/* Completion Modal */}
      {isEnded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel rounded-3xl p-8 max-w-md w-full text-center border border-dark-border shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Interview Completed</h3>
            <p className="text-xs text-dark-muted mb-6">
              You practiced with <strong>{compName}</strong> across {messages.length} conversational turns.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="glass-card rounded-xl p-3 text-center">
                <span className="text-[10px] text-dark-muted font-bold uppercase block">Duration</span>
                <span className="text-sm font-mono font-bold text-white">{formatTimer(elapsedSeconds)}</span>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <span className="text-[10px] text-dark-muted font-bold uppercase block">Total Turns</span>
                <span className="text-sm font-mono font-bold text-white">{messages.length}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/companies')}
              className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-bg font-bold text-xs shadow-lg shadow-brand-500/20 transition-all"
            >
              Return to Companies Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewPage;
