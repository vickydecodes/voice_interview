import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { interviewsApi } from '../api/client';
import PrintableReportView from '../components/PrintableReportView';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const InterviewReportPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await interviewsApi.getInterview(id);
        setSession(data);
      } catch (err) {
        console.error('Failed to load interview report:', err);
        setError(
          err.response?.data?.detail || 'Could not find or load this interview report.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSession();
    }
  }, [id]);

  // If user requested automatic print via ?print=true
  useEffect(() => {
    if (session && searchParams.get('print') === 'true') {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [session, searchParams]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-800 mb-2 shadow-xs">
          <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-xs font-medium text-slate-600">
          Loading report...
        </p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center border border-rose-200 shadow-xs">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h2 className="text-base font-bold text-slate-900 mb-1">Report Not Found</h2>
          <p className="text-xs text-slate-500 mb-5">{error || 'Session could not be loaded.'}</p>
          <button
            onClick={() => navigate('/companies')}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 transition-colors flex items-center gap-1.5 mx-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Companies</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <PrintableReportView
        session={session}
        candidate={user}
        onBack={() => navigate('/companies')}
        showBackButton={true}
      />
    </div>
  );
};

export default InterviewReportPage;
