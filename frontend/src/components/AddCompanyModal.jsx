import React, { useState } from 'react';
import { X, Globe, AlertCircle, ArrowRight } from 'lucide-react';
import { companiesApi } from '../api/client';

export const AddCompanyModal = ({ isOpen, onClose, onCompanyAdded }) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('Fetching website...');
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a website URL.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatusText('Fetching website content...');

    const t1 = setTimeout(() => setStatusText('Analyzing tech stack and scale...'), 2500);
    const t2 = setTimeout(() => setStatusText('Creating interview profile...'), 6000);

    try {
      const createdCompany = await companiesApi.createCompany(url, name);
      clearTimeout(t1);
      clearTimeout(t2);
      onCompanyAdded(createdCompany);
      handleClose();
    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      console.error('Failed to add company:', err);
      const message =
        err.response?.data?.detail ||
        err.message ||
        'Could not scrape company website. Please check the URL and try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setUrl('');
    setName('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-xl p-6 border border-gray-200 shadow-xl">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className="text-lg font-bold text-gray-900 mb-1">Add a Company</h2>
        <p className="text-xs text-gray-500 mb-4">
          Enter any company website to automatically extract their engineering focus and generate mock interview questions.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Company Website URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              required
              className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 focus:border-indigo-600 focus:outline-none text-xs text-gray-900 placeholder:text-gray-400 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Company Name <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Inc"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 focus:border-indigo-600 focus:outline-none text-xs text-gray-900 placeholder:text-gray-400 disabled:opacity-50"
            />
          </div>

          {/* Loading status */}
          {isLoading && (
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-2 text-xs text-gray-700">
              <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>{statusText}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium border border-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <span>Adding...</span>
              ) : (
                <>
                  <span>Add Company</span>
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
