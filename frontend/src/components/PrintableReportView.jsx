import React, { useState } from 'react';
import { 
  Printer, 
  Copy, 
  Check, 
  ArrowLeft, 
  Award, 
  Calendar, 
  Clock, 
  Building, 
  User, 
  CheckCircle, 
  Target, 
  MessageSquare
} from 'lucide-react';

export const PrintableReportView = ({
  session,
  candidate,
  elapsedSeconds,
  onBack,
  showBackButton = true,
}) => {
  const [copied, setCopied] = useState(false);

  if (!session) {
    return (
      <div className="p-8 text-center text-gray-500">
        No interview session data found.
      </div>
    );
  }

  const {
    id,
    company_snapshot: company = {},
    evaluation,
    messages = [],
    created_at,
    updated_at,
  } = session;

  const candidateInfo = session.candidate_snapshot || candidate || {};
  const candidateName = candidateInfo.name || 'Candidate';
  const candidateEmail = candidateInfo.email || '';
  const candidateSkills = candidateInfo.skills || [];

  const compName = company.name || 'Target Company';
  const difficultyLevel = company.difficulty_level || 'Medium';
  const focusAreas = company.focus_areas || [];

  const candidateTurns = messages.filter((m) => m.role === 'candidate');

  // Format date
  const interviewDate = created_at ? new Date(created_at) : new Date();
  const formattedDate = interviewDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = interviewDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate duration
  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const durationStr = elapsedSeconds 
    ? formatDuration(elapsedSeconds) 
    : (updated_at && created_at 
        ? formatDuration(Math.max(0, Math.floor((new Date(updated_at) - new Date(created_at)) / 1000))) 
        : 'Completed');

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

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summaryText = `MOCK INTERVIEW EVALUATION
Candidate: ${candidateName} (${candidateEmail})
Company: ${compName} (${difficultyLevel} Tier)
Date: ${formattedDate}
Score: ${evaluation?.rating || 'N/A'}/10
Verdict: ${evaluation?.verdict || 'N/A'}

Feedback:
${evaluation?.summary || 'N/A'}

Strengths:
${evaluation?.strengths?.map((s) => `• ${s}`).join('\n') || 'None'}

Things to Improve:
${evaluation?.improvements?.map((i) => `• ${i}`).join('\n') || 'None'}

Session Details:
• Messages: ${messages.length} (${candidateTurns.length} candidate answers)
• Duration: ${durationStr}`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full">
      {/* Top Toolbar */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-white border border-gray-200 shadow-xs sticky top-16 z-30">
        <div className="flex items-center gap-2">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-md bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium flex items-center gap-1.5 border border-gray-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <span className="text-xs text-gray-600">
            Interview with <strong className="text-gray-900">{compName}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-md bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium flex items-center gap-1.5 border border-gray-200 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-500" />
                <span>Copy Summary</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print to PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div 
        id="printable-interview-report"
        className="bg-white border border-gray-200 print:border-none rounded-xl print:rounded-none p-6 sm:p-8 shadow-xs"
      >
        {/* Masthead */}
        <div className="pb-5 mb-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Mock Interview Evaluation Report
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Target Company: <strong className="text-gray-800">{compName}</strong> ({difficultyLevel} Tier)
            </p>
          </div>

          <div className="text-xs text-gray-500 sm:text-right">
            <p className="font-medium text-gray-800">{formattedDate}</p>
            <p className="mt-0.5 text-gray-400">{formattedTime} • {durationStr}</p>
          </div>
        </div>

        {/* Candidate & Company Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-6">
          <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 text-xs space-y-1">
            <p className="font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-500" />
              <span>Candidate Details</span>
            </p>
            <p><span className="text-gray-500">Name:</span> <strong className="text-gray-900">{candidateName}</strong></p>
            {candidateEmail && <p><span className="text-gray-500">Email:</span> {candidateEmail}</p>}
            {candidateSkills.length > 0 && (
              <div className="pt-1.5">
                <span className="text-gray-500 block mb-1">Resume Skills:</span>
                <div className="flex flex-wrap gap-1">
                  {candidateSkills.slice(0, 8).map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-white text-[10px] text-gray-700 border border-gray-200">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 text-xs space-y-1">
            <p className="font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-gray-500" />
              <span>Company Information</span>
            </p>
            <p><span className="text-gray-500">Company:</span> <strong className="text-gray-900">{compName}</strong></p>
            <p><span className="text-gray-500">Industry:</span> {company.industry || 'Technology'}</p>
            {focusAreas.length > 0 && (
              <div className="pt-1.5">
                <span className="text-gray-500 block mb-1">Topics Tested:</span>
                <div className="flex flex-wrap gap-1">
                  {focusAreas.map((fa, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-white text-[10px] text-gray-700 border border-gray-200">
                      {fa}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Score & Feedback */}
        {evaluation && (
          <div className="mb-6 p-5 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div>
                <span className="text-xs text-gray-500 block">Performance Result</span>
                <h2 className="text-base font-bold text-gray-900 mt-0.5">Evaluation Verdict</h2>
              </div>

              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${getVerdictStyle(evaluation.verdict)}`}>
                  {evaluation.verdict}
                </span>

                <div className="flex items-baseline gap-1 bg-white px-3 py-1 rounded-md border border-gray-200">
                  <span className="text-xl font-bold text-gray-900">{evaluation.rating}</span>
                  <span className="text-xs text-gray-400">/ 10</span>
                </div>
              </div>
            </div>

            {evaluation.summary && (
              <div className="mt-3">
                <h4 className="text-xs font-semibold text-gray-700 mb-1">Feedback Summary</h4>
                <p className="text-xs text-gray-600 leading-relaxed">{evaluation.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* Strengths & Improvements */}
        {evaluation && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-6">
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
              <h4 className="font-semibold text-emerald-800 mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>What went well</span>
              </h4>
              <ul className="space-y-1 text-emerald-950">
                {evaluation.strengths?.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs">
              <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-600" />
                <span>Areas to improve</span>
              </h4>
              <ul className="space-y-1 text-amber-950">
                {evaluation.improvements?.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Full Transcript */}
        <div className="mt-6 pt-5 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <span>Full Interview Transcript</span>
            </h3>
            <span className="text-xs text-gray-500">{messages.length} messages</span>
          </div>

          <div className="space-y-2">
            {messages.map((msg, index) => {
              const isCandidate = msg.role === 'candidate';
              const speakerName = isCandidate ? candidateName : `${compName} Interviewer`;

              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border text-xs ${
                    isCandidate
                      ? 'bg-indigo-50/60 border-indigo-200 ml-2'
                      : 'bg-gray-50 border-gray-200 mr-2'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-800">
                      {speakerName}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      #{index + 1}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableReportView;
