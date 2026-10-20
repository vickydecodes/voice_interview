import React, { useEffect, useRef } from 'react';
import { User, Sparkles, MessageSquare } from 'lucide-react';

export const TranscriptPanel = ({ messages = [], interimTranscript = '', companyName = 'Interviewer' }) => {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript]);

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-card/60 backdrop-blur-md border border-dark-border rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-dark-border flex items-center justify-between bg-dark-bg/40">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Transcript</h3>
        </div>
        <span className="text-[11px] font-mono text-dark-muted px-2 py-0.5 rounded bg-dark-elevated border border-dark-border">
          {messages.length} {messages.length === 1 ? 'turn' : 'turns'}
        </span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-dark-muted py-12">
            <Sparkles className="w-8 h-8 text-dark-muted/40 mb-2 animate-pulse" />
            <p className="text-xs">Connecting with {companyName} AI...</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isAI = msg.role === 'interviewer';
            return (
              <div
                key={idx}
                className={`flex gap-3 text-left ${isAI ? 'justify-start' : 'justify-end'}`}
              >
                {/* AI Avatar */}
                {isAI && (
                  <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                    isAI
                      ? 'bg-dark-elevated text-gray-200 border border-dark-border'
                      : 'bg-brand-500 text-dark-bg font-medium shadow-md shadow-brand-500/15'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5 opacity-70">
                    <span className="font-bold text-[10px] uppercase tracking-wider">
                      {isAI ? companyName : 'You'}
                    </span>
                    <span className="text-[10px] font-mono">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Candidate Avatar */}
                {!isAI && (
                  <div className="w-8 h-8 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Interim live speech recognition streaming */}
        {interimTranscript && (
          <div className="flex gap-3 justify-end text-left opacity-80 animate-pulse">
            <div className="max-w-[80%] rounded-2xl p-3.5 text-xs bg-dark-elevated/80 border border-accent-cyan/40 text-accent-cyan italic">
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-70">
                You (speaking...)
              </span>
              "{interimTranscript}"
            </div>
            <div className="w-8 h-8 rounded-xl bg-accent-cyan/20 border border-accent-cyan/40 flex items-center justify-center text-accent-cyan shrink-0 mt-0.5">
              <User className="w-4 h-4 animate-ping" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default TranscriptPanel;
