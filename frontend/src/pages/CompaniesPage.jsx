import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { companiesApi, interviewsApi } from '../api/client';
import CompanyCard from '../components/CompanyCard';
import AddCompanyModal from '../components/AddCompanyModal';
import { 
  Plus, 
  Search, 
  Building, 
  AlertCircle, 
  FileText, 
  Printer, 
  Calendar, 
  ArrowRight
} from 'lucide-react';

export const CompaniesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('companies'); // 'companies' | 'reports'
  const [companies, setCompanies] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startingCompanyId, setStartingCompanyId] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await companiesApi.getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Failed to load companies. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInterviews = async () => {
    try {
      setLoadingReports(true);
      const data = await interviewsApi.getUserInterviews();
      setInterviews(data || []);
    } catch (err) {
      console.error('Error fetching user interviews:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchInterviews();
  }, []);

  const handleStartInterview = async (company) => {
    try {
      setStartingCompanyId(company.id);
      const session = await interviewsApi.createInterview(company.id);
      navigate(`/interview/${session.id}`);
    } catch (err) {
      console.error('Failed to create interview session:', err);
      const msg = err.response?.data?.detail || 'Could not start interview. Please try again.';
      alert(msg);
      setStartingCompanyId(null);
    }
  };

  const handleCompanyAdded = (newCompany) => {
    setCompanies((prev) => [newCompany, ...prev]);
  };

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.focus_areas && c.focus_areas.some((fa) => fa.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesDifficulty =
      selectedDifficulty === 'All' || c.difficulty_level === selectedDifficulty;
    return matchesSearch && matchesDifficulty;
  });

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Interview Catalog
          </h1>
          <p className="text-sm text-gray-600 mt-0.5">
            Select a company to start a realistic mock interview calibrated to their difficulty.
          </p>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Company</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('companies')}
          className={`flex items-center gap-1.5 pb-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === 'companies'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Companies ({companies.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('reports');
            fetchInterviews();
          }}
          className={`flex items-center gap-1.5 pb-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === 'reports'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Past Reports ({interviews.length})</span>
        </button>
      </div>

      {/* Tab 1: Companies */}
      {activeTab === 'companies' && (
        <>
          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search by company name, industry, or tech stack..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-gray-300 focus:border-indigo-600 focus:outline-none text-xs text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Difficulty Pill Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-gray-500 font-medium mr-1 hidden sm:inline">Tier:</span>
              {['All', 'Elite', 'Hard', 'Medium', 'Easy'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedDifficulty(tier)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors shrink-0 ${
                    selectedDifficulty === tier
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between gap-3 text-xs text-red-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchCompanies}
                className="px-2.5 py-1 rounded bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-56 rounded-xl bg-white border border-gray-200 animate-pulse p-5"
                />
              ))}
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center max-w-sm mx-auto border border-gray-200">
              <Building className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No Companies Found</h3>
              <p className="text-xs text-gray-500 mb-3">
                Try searching for a different keyword or add a new company URL.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDifficulty('All');
                }}
                className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-xs text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompanies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onStartInterview={handleStartInterview}
                  isStarting={startingCompanyId === company.id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Reports */}
      {activeTab === 'reports' && (
        <div>
          {loadingReports ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-44 rounded-xl bg-white border border-gray-200 animate-pulse p-5"
                />
              ))}
            </div>
          ) : interviews.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center max-w-sm mx-auto border border-gray-200">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No Reports Yet</h3>
              <p className="text-xs text-gray-500 mb-3">
                Start an interview and complete your practice session to get a scorecard.
              </p>
              <button
                onClick={() => setActiveTab('companies')}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors"
              >
                Choose a Company
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interviews.map((session) => {
                const comp = session.company_snapshot || {};
                const evalData = session.evaluation;
                const date = session.created_at ? new Date(session.created_at).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }) : 'Recent';

                return (
                  <div
                    key={session.id}
                    className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 hover:shadow-xs flex flex-col justify-between gap-3 transition-all"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-800 text-xs">
                            {comp.initial || (comp.name ? comp.name[0] : 'C')}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">{comp.name || 'Interview Session'}</h3>
                            <p className="text-xs text-gray-500">
                              {comp.difficulty_level || 'Medium'} Tier • {comp.industry || 'Technology'}
                            </p>
                          </div>
                        </div>

                        {evalData && (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getVerdictStyle(evalData.verdict)}`}>
                            {evalData.verdict}
                          </span>
                        )}
                      </div>

                      {/* Score & Summary */}
                      {evalData ? (
                        <div className="space-y-1.5">
                          <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                            <span className="text-xs text-gray-600 font-medium">Score</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-base font-bold text-gray-900">{evalData.rating}</span>
                              <span className="text-xs text-gray-400">/ 10</span>
                            </div>
                          </div>
                          {evalData.summary && (
                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                              {evalData.summary}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">
                          Interview recorded with {session.messages?.length || 0} conversation turns.
                        </p>
                      )}
                    </div>

                    {/* Footer Info & Actions */}
                    <div className="pt-2.5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{date}</span>
                        <span>•</span>
                        <span>{session.messages?.length || 0} turns</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Print PDF */}
                        <button
                          onClick={() => navigate(`/interview/${session.id}/report?print=true`)}
                          className="px-2.5 py-1.5 rounded-md bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium flex items-center gap-1.5 border border-gray-200 transition-colors"
                          title="Print Report"
                        >
                          <Printer className="w-3 h-3 text-gray-500" />
                          <span>Print</span>
                        </button>

                        {/* View Full Report */}
                        <button
                          onClick={() => navigate(`/interview/${session.id}/report`)}
                          className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <span>View Report</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal for adding custom company */}
      <AddCompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCompanyAdded={handleCompanyAdded}
      />
    </div>
  );
};

export default CompaniesPage;
