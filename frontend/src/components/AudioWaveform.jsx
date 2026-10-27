import React from 'react';
import { Volume2, Mic, Loader2 } from 'lucide-react';

export const AudioWaveform = ({ state = 'idle', companyName = 'Interviewer' }) => {
  // state: 'speaking' | 'listening' | 'thinking' | 'idle'

  return (
    <div className="flex flex-col items-center justify-center py-4">
      {/* Company Avatar / Call Status */}
      <div className="relative mb-4">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl transition-all ${
          state === 'speaking'
            ? 'bg-indigo-100 text-indigo-700 ring-4 ring-indigo-200'
            : state === 'listening'
            ? 'bg-red-100 text-red-700 ring-4 ring-red-200'
            : state === 'thinking'
            ? 'bg-amber-100 text-amber-700 ring-4 ring-amber-200'
            : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
        }`}>
          {companyName ? companyName[0] : 'I'}
        </div>

        {/* Small badge icon */}
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-xs flex items-center justify-center text-gray-700">
          {state === 'speaking' && <Volume2 className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />}
          {state === 'listening' && <Mic className="w-3.5 h-3.5 text-red-600 animate-pulse" />}
          {state === 'thinking' && <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />}
          {state === 'idle' && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
        </div>
      </div>

      {/* Status Heading & Instructions */}
      <h3 className="text-base font-semibold text-gray-900 mb-0.5">
        {state === 'speaking' && `${companyName} is speaking`}
        {state === 'listening' && 'Listening to you...'}
        {state === 'thinking' && 'Processing your response...'}
        {state === 'idle' && 'Your Turn to Speak'}
      </h3>

      <p className="text-xs text-gray-500 text-center max-w-xs">
        {state === 'speaking' && 'Listen carefully to the question before replying.'}
        {state === 'listening' && 'Speak your answer clearly into your microphone.'}
        {state === 'thinking' && 'Analyzing your solution and trade-offs...'}
        {state === 'idle' && 'Click the microphone button below to record your answer.'}
      </p>

      {/* Simple, gentle sound wave dots */}
      {(state === 'speaking' || state === 'listening') && (
        <div className="flex items-center gap-1 mt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`w-1.5 rounded-full animate-bounce ${
                state === 'speaking' ? 'bg-indigo-600' : 'bg-red-600'
              }`}
              style={{
                height: `${12 + (i % 3) * 8}px`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AudioWaveform;
