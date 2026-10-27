import React, { useEffect, useRef } from 'react';
import { MessageSquare, User } from 'lucide-react';

export const TranscriptPanel = ({ messages = [], interimTranscript = '', companyName = 'Interviewer' }) => {
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
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
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          <h3 className="text-xs font-bold text-gray-800">Transcript</h3>
        </div>
        <span className="text-[11px] text-gray-500 font-medium">
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </span>
      </div>

      {/* Message Feed */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-10">
            <p className="text-xs">Interview is starting...</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isAI = msg.role === 'interviewer';
            return (
              <div
                key={idx}
                className={`flex gap-2 text-left ${isAI ? 'justify-start' : 'justify-end'}`}
              >
                {/* AI Avatar */}
                {isAI && (
                  <div className="w-6 h-6 rounded bg-gray-200 text-gray-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {companyName[0] || 'AI'}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed break-words overflow-hidden ${
                    isAI
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  <div className={`flex items-center justify-between gap-3 mb-1 text-[10px] ${isAI ? 'text-gray-500' : 'text-indigo-200'}`}>
                    <span className="font-semibold">
                      {isAI ? companyName : 'You'}
                    </span>
                    <span className="opacity-80">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Candidate Avatar */}
                {!isAI && (
                  <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Live speech preview while speaking */}
        {interimTranscript && (
          <div className="flex gap-2 justify-end text-left opacity-90">
            <div className="max-w-[85%] rounded-lg p-2.5 text-xs bg-indigo-50 border border-indigo-200 text-indigo-900 italic">
              <span className="text-[10px] font-semibold text-indigo-600 block mb-0.5">
                Listening...
              </span>
              "{interimTranscript}"
            </div>
            <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-3.5 h-3.5 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptPanel;
