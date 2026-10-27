import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/client';
import {
  Upload,
  FileText,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Briefcase,
  Mic,
  Award,
} from 'lucide-react';

export const LandingPage = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Parsing resume...');
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
      setError('Please upload a PDF (.pdf) or Word (.docx) document.');
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
    setLoadingText('Extracting resume text...');

    const t1 = setTimeout(() => setLoadingText('Analyzing projects and tech stack...'), 2000);
    const t2 = setTimeout(() => setLoadingText('Setting up candidate profile...'), 5000);

    try {
      const authResponse = await authApi.uploadResume(file);
      clearTimeout(t1);
      clearTimeout(t2);
      login(authResponse);
      navigate('/companies');
    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      console.error('Resume upload error:', err);
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Failed to parse resume. Please check the file and try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-center items-center py-10 px-4">
      <div className="max-w-xl w-full text-center">
        {/* Active Session Notification */}
        {isAuthenticated && user && (
          <div className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs">
            <span>Logged in as <strong>{user.name}</strong></span>
            <button
              onClick={() => navigate('/companies')}
              className="font-bold hover:underline flex items-center gap-1 ml-1"
            >
              Go to Companies <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Hero Title & Subtitle */}
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-2">
          Voice Mock Interviews for Developers
        </h1>

        <p className="text-sm text-gray-600 max-w-md mx-auto mb-8">
          Upload your resume to get interview questions based on your real projects and tech stack, then answer using your mic.
        </p>

        {/* Upload Card */}
        <div className="bg-white rounded-xl p-6 sm:p-7 border border-gray-200 shadow-sm text-left">
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Upload your resume
          </label>

          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-indigo-600 bg-indigo-50/50'
                : file
                ? 'border-indigo-300 bg-indigo-50/30'
                : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
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
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2">
                  <FileText className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-gray-500 mb-2">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <span className="text-xs text-indigo-600 font-medium hover:underline">
                  Change file
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-gray-800 mb-1">
                  Click to browse, or drag & drop your resume here
                </p>
                <p className="text-xs text-gray-500">
                  Accepts PDF or Word (.docx), up to 15MB
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading status */}
          {isLoading && (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-xs text-gray-700 font-medium">{loadingText}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleUpload}
            disabled={!file || isLoading}
            className="w-full mt-4 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            {isLoading ? (
              <span>Analyzing resume...</span>
            ) : (
              <>
                <span>Continue to Select Company</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* 3 Steps Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 text-left">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-xs">
            <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center mb-2">
              1
            </div>
            <h4 className="text-xs font-semibold text-gray-900 mb-0.5">Upload Resume</h4>
            <p className="text-xs text-gray-500 leading-normal">
              Extracts your real projects, skills, and work history.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-xs">
            <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center mb-2">
              2
            </div>
            <h4 className="text-xs font-semibold text-gray-900 mb-0.5">Pick Company</h4>
            <p className="text-xs text-gray-500 leading-normal">
              Select Google, Stripe, Netflix or add any company website.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-xs">
            <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center mb-2">
              3
            </div>
            <h4 className="text-xs font-semibold text-gray-900 mb-0.5">Speak & Learn</h4>
            <p className="text-xs text-gray-500 leading-normal">
              Answer questions out loud and get honest scores and feedback.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
