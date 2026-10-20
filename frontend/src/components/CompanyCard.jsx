import React from 'react';
import { ArrowRight, Flame, ShieldAlert, Sparkles, Building, Layers } from 'lucide-react';

export const CompanyCard = ({ company, onStartInterview, isStarting = false }) => {
  const getDifficultyBadge = (level) => {
    switch (level) {
      case 'Elite':
        return {
          bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-rose-500/10',
          dot: 'bg-rose-400',
          icon: Flame,
        };
      case 'Hard':
        return {
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-amber-500/10',
          dot: 'bg-amber-400',
          icon: ShieldAlert,
        };
      case 'Medium':
        return {
          bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-cyan-500/10',
          dot: 'bg-cyan-400',
          icon: Layers,
        };
      default:
        return {
          bg: 'bg-brand-500/15 text-brand-300 border-brand-500/30 shadow-brand-500/10',
          dot: 'bg-brand-400',
          icon: Sparkles,
        };
    }
  };

  const badge = getDifficultyBadge(company.difficulty_level);
  const BadgeIcon = badge.icon;

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col justify-between relative group overflow-hidden">
      {/* Top subtle highlight line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        {/* Header: Initial + Name + Difficulty Badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-dark-elevated border border-dark-border flex items-center justify-center text-lg font-extrabold text-white group-hover:border-brand-500/50 group-hover:text-brand-400 transition-all shadow-md">
              {company.initial || company.name?.[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-brand-400 transition-colors flex items-center gap-2">
                {company.name}
              </h3>
              <p className="text-xs text-dark-muted font-medium line-clamp-1">{company.industry}</p>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.bg} shadow-sm shrink-0`}
          >
            <BadgeIcon className="w-3 h-3" />
            <span>{company.difficulty_level}</span>
            <span className="opacity-60 text-[10px]">({company.difficulty_score}/10)</span>
          </div>
        </div>

        {/* Brand Summary */}
        <p className="text-xs text-dark-muted/90 line-clamp-2 mb-4 leading-relaxed font-normal">
          {company.brand_summary || company.brand_identity}
        </p>

        {/* Valuation / Scale Tag */}
        {company.estimated_valuation_or_scale && (
          <div className="mb-4 flex items-center gap-1.5 text-[11px] text-dark-muted font-mono">
            <Building className="w-3 h-3 text-brand-400/80" />
            <span className="text-gray-300 font-medium">{company.estimated_valuation_or_scale}</span>
          </div>
        )}

        {/* Focus Areas */}
        {company.focus_areas && company.focus_areas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {company.focus_areas.slice(0, 3).map((area, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-md bg-dark-bg/60 text-dark-muted border border-dark-border/60 font-medium"
              >
                {area}
              </span>
            ))}
            {company.focus_areas.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 text-dark-muted/60">
                +{company.focus_areas.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Start Interview CTA */}
      <button
        onClick={() => onStartInterview(company)}
        disabled={isStarting}
        className="w-full mt-2 py-2.5 px-4 rounded-xl bg-dark-elevated hover:bg-brand-500 hover:text-dark-bg text-white font-semibold text-xs border border-dark-border hover:border-brand-500 transition-all duration-200 flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isStarting ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Preparing Session...</span>
          </>
        ) : (
          <>
            <span>Start Interview</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </div>
  );
};

export default CompanyCard;
