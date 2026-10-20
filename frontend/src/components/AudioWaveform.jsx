import React from 'react';
import { Volume2, Mic, Cpu, Radio } from 'lucide-react';

export const AudioWaveform = ({ state = 'idle', companyName = 'AI Interviewer' }) => {
  // state: 'speaking' | 'listening' | 'thinking' | 'idle'

  const getStateConfig = () => {
    switch (state) {
      case 'speaking':
        return {
          label: `${companyName} is Speaking`,
          subtext: 'Listen carefully to the question...',
          ringColor: 'border-brand-500/40',
          glowColor: 'rgba(16, 185, 129, 0.25)',
          badgeColor: 'bg-brand-500/10 text-brand-400 border-brand-500/30',
          icon: Volume2,
          iconColor: 'text-brand-400',
        };
      case 'listening':
        return {
          label: 'Listening to You',
          subtext: 'Speak naturally into your microphone',
          ringColor: 'border-accent-cyan/50',
          glowColor: 'rgba(6, 182, 212, 0.3)',
          badgeColor: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30',
          icon: Mic,
          iconColor: 'text-accent-cyan',
        };
      case 'thinking':
        return {
          label: 'AI is Analyzing Answer...',
          subtext: 'Evaluating response against company rubric',
          ringColor: 'border-accent-amber/50',
          glowColor: 'rgba(245, 158, 11, 0.25)',
          badgeColor: 'bg-accent-amber/10 text-accent-amber border-accent-amber/30',
          icon: Cpu,
          iconColor: 'text-accent-amber',
        };
      default:
        return {
          label: 'Ready',
          subtext: 'Click the mic or speak to continue',
          ringColor: 'border-dark-border',
          glowColor: 'rgba(99, 102, 241, 0.15)',
          badgeColor: 'bg-dark-elevated text-dark-muted border-dark-border',
          icon: Radio,
          iconColor: 'text-dark-muted',
        };
    }
  };

  const config = getStateConfig();
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center p-8 relative">
      {/* Outer ambient glow */}
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl transition-all duration-700 pointer-events-none"
        style={{ backgroundColor: config.glowColor }}
      />

      {/* Main Avatar Container */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Pulsing Outer Rings */}
        <div
          className={`absolute w-44 h-44 rounded-full border ${config.ringColor} ${
            state === 'listening' || state === 'speaking' ? 'animate-pulse' : 'opacity-40'
          }`}
        />
        <div
          className={`absolute w-52 h-52 rounded-full border border-dashed ${config.ringColor} ${
            state === 'thinking' ? 'animate-spin duration-1000' : 'opacity-20'
          }`}
        />

        {/* Core AI Orb */}
        <div
          className={`w-36 h-36 rounded-full glass-panel flex flex-col items-center justify-center shadow-2xl relative z-10 border transition-all duration-500 ${
            state === 'speaking'
              ? 'border-brand-500/60 shadow-brand-500/30'
              : state === 'listening'
              ? 'border-accent-cyan/60 shadow-accent-cyan/30'
              : state === 'thinking'
              ? 'border-accent-amber/60 shadow-accent-amber/30'
              : 'border-dark-border'
          }`}
        >
          {state === 'speaking' ? (
            /* Animated Waveform Bars */
            <div className="flex items-center gap-1.5 h-12">
              <span className="w-1.5 bg-brand-400 rounded-full animate-wave-bar" style={{ animationDelay: '0.1s' }} />
              <span className="w-1.5 bg-brand-400 rounded-full animate-wave-bar" style={{ animationDelay: '0.4s' }} />
              <span className="w-1.5 bg-accent-cyan rounded-full animate-wave-bar" style={{ animationDelay: '0.2s' }} />
              <span className="w-1.5 bg-brand-400 rounded-full animate-wave-bar" style={{ animationDelay: '0.5s' }} />
              <span className="w-1.5 bg-brand-400 rounded-full animate-wave-bar" style={{ animationDelay: '0.3s' }} />
            </div>
          ) : state === 'listening' ? (
            /* Microphone Listening Indicator */
            <div className="relative flex items-center justify-center">
              <div className="absolute w-14 h-14 rounded-full bg-accent-cyan/20 animate-ping" />
              <Mic className="w-10 h-10 text-accent-cyan relative z-10" />
            </div>
          ) : state === 'thinking' ? (
            /* Thinking Spinner */
            <div className="flex flex-col items-center justify-center">
              <Cpu className="w-10 h-10 text-accent-amber animate-pulse" />
            </div>
          ) : (
            /* Idle Logo State */
            <Icon className={`w-10 h-10 ${config.iconColor}`} />
          )}
        </div>
      </div>

      {/* Status Pill */}
      <div className="flex flex-col items-center text-center z-10">
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold border ${config.badgeColor} mb-2 shadow-sm`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              state === 'speaking'
                ? 'bg-brand-400 animate-ping'
                : state === 'listening'
                ? 'bg-accent-cyan animate-pulse'
                : state === 'thinking'
                ? 'bg-accent-amber animate-spin'
                : 'bg-dark-muted'
            }`}
          />
          {config.label}
        </div>
        <p className="text-xs text-dark-muted font-normal max-w-xs">{config.subtext}</p>
      </div>
    </div>
  );
};

export default AudioWaveform;
