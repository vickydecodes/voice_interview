import React, { useState } from 'react';
import { X, Globe, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { companiesApi } from '../api/client';

export const AddCompanyModal = ({ isOpen, onClose, onCompanyAdded }) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a valid website URL.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep(1);

    // Dynamic progress feedback
    const stepTimer1 = setTimeout(() => setLoadingStep(2), 2500);
    const stepTimer2 = setTimeout(() => setLoadingStep(3), 6000);

    try {
      const createdCompany = await companiesApi.createCompany(url, name);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      onCompanyAdded(createdCompany);
      handleClose();
    } catch (err) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      console.error('Failed to add company:', err);
      const message =
        err.response?.data?.detail ||
        err.message ||
        'Failed to scrape and analyze the company website. Please check the URL and try again.';
      setError(message);
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setUrl('');
    setName('');
    setError(null);
    setLoadingStep(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-dark-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isLoading}
          className="absolute top-5 right-5 p-2 rounded-xl text-dark-muted hover:text-white hover:bg-dark-elevated transition-colors disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-3 shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Add Target Company</h2>
          <p className="text-xs text-dark-muted mt-1">
            Provide a company website URL. Our crawler extracts live pages and OpenRouter AI evaluates their
            hiring bar, engineering culture, and interview style.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-accent-rose/10 border border-accent-rose/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-accent-rose shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Scraping / Analysis Error</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Company Website URL <span className="text-brand-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-muted">
                <Globe className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="e.g. https://anthropic.com or datadoghq.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm text-white placeholder-dark-muted/60 transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Company Name <span className="text-dark-muted font-normal">(Optional, auto-detected if blank)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Anthropic"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm text-white placeholder-dark-muted/60 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Loading status steps */}
          {isLoading && (
            <div className="p-4 rounded-xl bg-dark-elevated/70 border border-brand-500/20 space-y-2 mt-4">
              <div className="flex items-center gap-2.5 text-xs text-brand-300 font-medium">
                <span className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>
                  {loadingStep === 1 && 'Scraping website HTML, headers, and meta descriptions...'}
                  {loadingStep === 2 && 'OpenRouter is evaluating talent bar & culture signals...'}
                  {loadingStep === 3 && 'Calibrating interview difficulty score and focus areas...'}
                </span>
              </div>
              <div className="w-full bg-dark-border h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${loadingStep * 33}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-dark-muted hover:text-white hover:bg-dark-elevated transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-bg font-bold text-xs shadow-lg shadow-brand-500/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Scrape & Analyze</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCompanyModal;
