import React from 'react';
import { ArrowRight } from 'lucide-react';

export const CompanyCard = ({ company, onStartInterview, isStarting = false }) => {
  const getDifficultyBadge = (level) => {
    switch (level) {
      case 'Elite':
      case 'Hard':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const badgeClass = getDifficultyBadge(company.difficulty_level);

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 hover:shadow-xs transition-all flex flex-col justify-between">
      <div>
        {/* Header: Company Name & Difficulty */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 text-gray-800 font-bold text-sm flex items-center justify-center">
              {company.initial || company.name?.[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">
                {company.name}
              </h3>
              <p className="text-xs text-gray-500">{company.industry}</p>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeClass} shrink-0`}
          >
            {company.difficulty_level} ({company.difficulty_score}/10)
          </span>
        </div>

        {/* Short Summary */}
        <p className="text-xs text-gray-600 line-clamp-2 my-2.5 leading-relaxed">
          {company.brand_summary || company.brand_identity}
        </p>

        {/* Focus Areas Chips */}
        {company.focus_areas && company.focus_areas.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {company.focus_areas.slice(0, 3).map((area, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium"
              >
                {area}
              </span>
            ))}
            {company.focus_areas.length > 3 && (
              <span className="text-[11px] px-1.5 py-0.5 text-gray-400">
                +{company.focus_areas.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Start Button */}
      <button
        onClick={() => onStartInterview(company)}
        disabled={isStarting}
        className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
      >
        {isStarting ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <span>Start Practice Interview</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </div>
  );
};

export default CompanyCard;
