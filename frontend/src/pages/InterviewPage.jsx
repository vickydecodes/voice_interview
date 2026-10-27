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
  Volume2,
  VolumeX,
  AlertCircle,
  Clock,
  Printer,
  FileText,
  ArrowRight,
} from 'lucide-react';

export const InterviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null);

  // Typed input fallback
  const [typedInput, setTypedInput] = useState('');

  // Audio mute toggle
  const [isMuted, setIsMuted] = useState(false);

  // Evaluation states
  const [isEnded, setIsEnded] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [evaluationError, setEvaluationError] = useState(null);

  // Live Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const hasGreetedRef = useRef(false);

  // Speech Recognition & Synthesis Hook
  const {
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    resetTranscript,
    error: voiceError,
  } = useVoice({
    onTranscriptEnd: (finalAnswer) => {
      if (finalAnswer && finalAnswer.trim().length > 0) {
        handleSendAnswer(finalAnswer);
      }
    },
  });

  // Timer interval
  useEffect(() => {
    if (isEnded) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isEnded]);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
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
        if (data.status === 'completed' && data.evaluation) {
          setEvaluation(data.evaluation);
          setIsEnded(true);
        }

        // Speak opening greeting once loaded
        if (!hasGreetedRef.current && data.messages && data.messages.length > 0) {
          hasGreetedRef.current = true;
          const firstMsg = data.messages[0];
          if (firstMsg.role === 'interviewer') {
            setTimeout(() => {
              if (!isMuted) {
                speak(firstMsg.text);
              }
            }, 600);
          }
        }
      } catch (err) {
        console.error('Failed to load interview session:', err);
        setError('Interview session could not be found.');
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

    stopListening();
    setIsThinking(true);
    resetTranscript();
    setTypedInput('');

    // Optimistic UI update
    const tempCandidateMsg = {
      role: 'candidate',
      text: answer,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempCandidateMsg]);

    try {
      const response = await interviewsApi.sendTurn(id, answer);
      setMessages(response.messages);

      // Speak interviewer reply if not muted
      if (!isMuted && response.reply) {
        speak(response.reply);
      }
    } catch (err) {
      console.error('Error during interview turn:', err);
      const errMsg =
        err.response?.data?.detail || err.message || 'Failed to submit answer.';
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

  const handleEndInterview = async () => {
    stopListening();
    stopSpeaking();
    setIsEnded(true);
    setIsEvaluating(true);
    setEvaluationError(null);

    try {
      const data = await interviewsApi.completeInterview(id);
      if (data && data.evaluation) {
        setEvaluation(data.evaluation);
        setSession(data);
      }
    } catch (err) {
      console.error('Failed to evaluate interview:', err);
      setEvaluationError(err.response?.data?.detail || 'Could not generate evaluation.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const getVerdictStyle = (verdict = '') => {
    const v = verdict.toLowerCase();
    if (v.includes('strong hire') || v.includes('hire')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (v.includes('lean')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    return 'bg-purple-50 text-purple-800 border-purple-200';
  };

  const getAvatarState = () => {
    if (isSpeaking) return 'speaking';
    if (isThinking) return 'thinking';
    if (isListening) return 'listening';
    return 'idle';
  };

  const company = session?.company_snapshot || {};
  const compName = company.name || 'Interviewer';

  if (loadingSession) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-indigo-600 mb-2 shadow-xs">
          <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-xs text-gray-600 font-medium">Connecting to interview...</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center border border-red-200 shadow-sm">
          <AlertCircle className="w-7 h-7 text-red-500 mx-auto mb-2" />
          <h2 className="text-sm font-bold text-gray-900 mb-1">Session Error</h2>
          <p className="text-xs text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => navigate('/companies')}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 transition-colors"
          >
            Back to Companies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-gray-50 overflow-hidden">
      {/* Top Header Bar */}
      <div className="border-b border-gray-200 bg-white px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0">
        {/* Left: Company & Difficulty Details */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-800 text-xs">
            {company.initial || compName[0]}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-gray-900">{compName}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-700 border border-gray-200">
                {company.difficulty_level || 'Medium'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 hidden sm:block">
              {company.industry || 'Software Engineering'}
            </p>
          </div>
        </div>

        {/* Center: Live Timer */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-gray-100 border border-gray-200 text-xs font-mono font-medium text-gray-700">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          <span>{formatTimer(elapsedSeconds)}</span>
        </div>

        {/* Right: Sound toggle & End Call CTA */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!isMuted) stopSpeaking();
              setIsMuted(!isMuted);
            }}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              isMuted
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleEndInterview}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">End Interview</span>
          </button>
        </div>
      </div>

      {/* Main Call Stage */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        {/* Left Column: Call Stage & Mic Controls (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-white rounded-xl p-5 border border-gray-200 shadow-xs h-full min-h-0 overflow-y-auto">
          {/* Audio Waveform Avatar */}
          <div className="my-auto py-2">
            <AudioWaveform state={getAvatarState()} companyName={compName} />

            {/* Error notifications */}
            {error && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 text-center max-w-md mx-auto">
                {error}
              </div>
            )}
            {voiceError && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 text-center max-w-md mx-auto">
                {voiceError}
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto pt-3 border-t border-gray-100">
            {/* Live speech preview if user speaking */}
            {(transcript || interimTranscript) && (
              <div className="w-full p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-gray-800 text-left">
                <div className="flex items-center justify-between mb-1 text-[10px] text-indigo-600 font-semibold">
                  <span>Your live speech:</span>
                  <button
                    onClick={resetTranscript}
                    className="text-gray-400 hover:text-gray-600 underline"
                  >
                    clear
                  </button>
                </div>
                <p className="line-clamp-3 text-gray-800">
                  {transcript}
                  {interimTranscript && (
                    <span className="text-indigo-600 italic">
                      {transcript ? ` ${interimTranscript}` : interimTranscript}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Primary Mic Button */}
            <div className="flex items-center gap-2 w-full justify-center">
              <button
                onClick={toggleMic}
                disabled={isSpeaking || isThinking}
                className={`flex-1 py-3 px-5 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-xs ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Stop Recording & Submit</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Click to Speak Answer</span>
                  </>
                )}
              </button>

              {transcript && (
                <button
                  onClick={() => handleSendAnswer(transcript)}
                  disabled={isThinking}
                  className="p-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs transition-colors disabled:opacity-50"
                  title="Send Answer"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Typed fallback input */}
            <div className="w-full flex items-center gap-2">
              <input
                type="text"
                placeholder="Or type your answer here..."
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendAnswer(typedInput);
                }}
                className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-gray-300 focus:border-indigo-600 focus:outline-none text-xs text-gray-900 placeholder:text-gray-400"
              />
              <button
                onClick={() => handleSendAnswer(typedInput)}
                disabled={!typedInput.trim() || isThinking}
                className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-medium text-xs flex items-center gap-1 disabled:opacity-40"
              >
                <span>Send</span>
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Transcript (5 cols) */}
        <div className="lg:col-span-5 h-[500px] lg:h-full min-h-0">
          <TranscriptPanel
            messages={messages}
            interimTranscript={interimTranscript}
            companyName={compName}
          />
        </div>
      </div>

      {/* Completion & Scorecard Modal */}
      {isEnded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs overflow-y-auto">
          {isEvaluating ? (
            <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center border border-gray-200 shadow-xl">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mx-auto mb-3">
                <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Generating Scorecard...</h3>
              <p className="text-xs text-gray-500 leading-normal">
                Evaluating answers against <strong>{compName}</strong>'s technical rubric.
              </p>
            </div>
          ) : evaluation ? (
            <div className="bg-white rounded-xl p-6 max-w-lg w-full text-left border border-gray-200 shadow-xl my-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-800 text-xs">
                    {company.initial || compName[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{compName} Interview Results</h3>
                    <p className="text-xs text-gray-500">{company.difficulty_level || 'Medium'} Tier Evaluation</p>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getVerdictStyle(evaluation.verdict)}`}>
                  {evaluation.verdict}
                </span>
              </div>

              {/* Score Box */}
              <div className="my-3.5 p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500 font-medium block">Overall Score</span>
                  <p className="text-xs text-gray-800 font-semibold">Technical Performance</p>
                </div>
                <div className="flex items-baseline gap-1 bg-white px-3 py-1 rounded-md border border-gray-200">
                  <span className="text-2xl font-bold text-gray-900">
                    {evaluation.rating}
                  </span>
                  <span className="text-xs text-gray-400">/ 10</span>
                </div>
              </div>

              {/* Feedback Summary */}
              {evaluation.summary && (
                <div className="mb-3.5 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-800 mb-1">
                    Feedback Summary
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {evaluation.summary}
                  </p>
                </div>
              )}

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
                {evaluation.strengths && evaluation.strengths.length > 0 && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-xs font-semibold text-emerald-800 block mb-1">
                      Strengths
                    </span>
                    <ul className="space-y-1 text-xs text-emerald-950">
                      {evaluation.strengths.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.improvements && evaluation.improvements.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="text-xs font-semibold text-amber-800 block mb-1">
                      Things to Practice
                    </span>
                    <ul className="space-y-1 text-xs text-amber-950">
                      {evaluation.improvements.map((imp, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Session Stats Mini Bar */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-center text-xs">
                <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-[10px] text-gray-500 block">Duration</span>
                  <span className="font-semibold text-gray-900">{formatTimer(elapsedSeconds)}</span>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-[10px] text-gray-500 block">Answers Given</span>
                  <span className="font-semibold text-gray-900">{messages.filter(m => m.role === 'candidate').length} Turns</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/interview/${id}/report?print=true`)}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save PDF Report</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate(`/interview/${id}/report`)}
                    className="py-2 px-3 rounded-lg bg-white hover:bg-gray-50 text-gray-700 font-medium text-xs border border-gray-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-gray-500" />
                    <span>View Report</span>
                  </button>

                  <button
                    onClick={() => navigate('/companies')}
                    className="py-2 px-3 rounded-lg bg-white hover:bg-gray-50 text-gray-700 font-medium text-xs border border-gray-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center border border-gray-200 shadow-xl">
              <h3 className="text-base font-bold text-gray-900 mb-1">Interview Finished</h3>
              <p className="text-xs text-gray-500 mb-4">
                Completed session with <strong>{compName}</strong> across {messages.length} messages.
              </p>

              {evaluationError && (
                <div className="p-2.5 mb-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {evaluationError}
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/interview/${id}/report`)}
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Transcript Report</span>
                </button>

                <button
                  onClick={() => navigate('/companies')}
                  className="w-full py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 font-medium text-xs border border-gray-200 transition-colors"
                >
                  Return to Companies
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InterviewPage;
