import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/client';
import {
  UploadCloud,
  FileText,
  Sparkles,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  Mic,
} from 'lucide-react';

export const LandingPage = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(1);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError(null);
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      setError('Please upload a PDF (.pdf) or Microsoft Word (.docx) document.');
      return;
    }
    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('File size exceeds 15MB limit. Please upload a smaller document.');
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a resume file first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStage(1);

    const stageTimer1 = setTimeout(() => setLoadingStage(2), 2000);
    const stageTimer2 = setTimeout(() => setLoadingStage(3), 5500);

    try {
      const authResponse = await authApi.uploadResume(file);
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      login(authResponse);
      navigate('/companies');
    } catch (err) {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      console.error('Resume upload error:', err);
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Failed to parse resume. Please check file format and try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-2xl w-full text-center relative z-10">
        {/* Existing Session pill if user is authenticated */}
        {isAuthenticated && user && (
          <div className="mb-6 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-medium">
            <span>Signed in as <strong>{user.name}</strong></span>
            <button
              onClick={() => navigate('/companies')}
              className="underline hover:text-white font-semibold flex items-center gap-1 ml-1"
            >
              Go to Companies <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Hero Title */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-elevated border border-dark-border text-brand-400 text-xs font-semibold mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Zero Signups. Your Resume is Your Identity.</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
          Calibrate Your Skills with <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-accent-cyan to-brand-500">
            Real Voice AI Interviews
          </span>
        </h1>

        <p className="text-sm sm:text-base text-dark-muted max-w-xl mx-auto mb-8 font-normal leading-relaxed">
          Upload your resume in PDF or DOCX. OpenRouter parses your experience and projects,
          instantly unlocking tailored voice mock interviews against top tech companies.
        </p>

        {/* Upload Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-dark-border shadow-2xl text-left">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-brand-400 bg-brand-500/10 scale-[1.01]'
                : file
                ? 'border-brand-500/40 bg-dark-elevated/80'
                : 'border-dark-border/80 hover:border-brand-500/40 hover:bg-dark-elevated/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-3 shadow-lg">
                  <FileText className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1 truncate max-w-xs">{file.name}</h4>
                <p className="text-xs text-dark-muted mb-3">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to parse
                </p>
                <span className="text-xs font-semibold text-brand-400 hover:text-brand-300 underline">
                  Click to choose a different file
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-dark-elevated border border-dark-border flex items-center justify-center text-dark-muted mb-3 group-hover:text-brand-400 transition-colors">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Drag and drop your resume here, or <span className="text-brand-400">browse</span>
                </h4>
                <p className="text-xs text-dark-muted font-normal">
                  Supports PDF or DOCX (Max 15MB)
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 rounded-xl bg-accent-rose/10 border border-accent-rose/30 flex items-start gap-3 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-accent-rose shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Failed to process resume</p>
                <p className="opacity-90">{error}</p>
                <button
                  type="button"
                  onClick={handleUpload}
                  className="mt-2 text-xs font-bold text-rose-200 underline hover:text-white"
                >
                  Retry Upload
                </button>
              </div>
            </div>
          )}

          {/* Loading Animation & Steps */}
          {isLoading && (
            <div className="mt-5 p-5 rounded-2xl bg-dark-elevated border border-brand-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  {loadingStage === 1 && 'Extracting text from document...'}
                  {loadingStage === 2 && 'OpenRouter AI analyzing skills & engineering highlights...'}
                  {loadingStage === 3 && 'Generating profile & issuing candidate credentials...'}
                </span>
                <span className="text-brand-400 font-mono font-bold">{loadingStage * 33}%</span>
              </div>
              <div className="w-full bg-dark-border h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-brand-500 to-accent-cyan h-full rounded-full transition-all duration-700"
                  style={{ width: `${loadingStage * 33}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit CTA Button */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-dark-muted">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Instant Identity
              </span>
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-accent-cyan" /> Voice-Ready
              </span>
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || isLoading}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-bg font-extrabold text-xs tracking-wide shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02]"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
                  <span>Parsing Resume...</span>
                </>
              ) : (
                <>
                  <span>Begin Interview Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3 Step Flow Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 text-left">
          <div className="glass-card rounded-2xl p-5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold mb-3">
              1
            </div>
            <h4 className="text-xs font-bold text-white mb-1">Upload Resume</h4>
            <p className="text-[11px] text-dark-muted font-normal leading-relaxed">
              PDF or DOCX parsed into structured candidate metadata without passwords.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan text-xs font-bold mb-3">
              2
            </div>
            <h4 className="text-xs font-bold text-white mb-1">Pick or Scrape Company</h4>
            <p className="text-[11px] text-dark-muted font-normal leading-relaxed">
              Select pre-seeded giants or crawl any target company website URL.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="w-8 h-8 rounded-lg bg-accent-indigo/10 border border-accent-indigo/20 flex items-center justify-center text-accent-indigo text-xs font-bold mb-3">
              3
            </div>
            <h4 className="text-xs font-bold text-white mb-1">Real-Time Voice Call</h4>
            <p className="text-[11px] text-dark-muted font-normal leading-relaxed">
              AI speaks and listens naturally via browser Speech APIs, testing your real projects.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
