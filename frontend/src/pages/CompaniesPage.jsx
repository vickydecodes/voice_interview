import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { companiesApi, interviewsApi } from '../api/client';
import CompanyCard from '../components/CompanyCard';
import AddCompanyModal from '../components/AddCompanyModal';
import { Plus, Search, Building2, Sparkles, Filter, AlertCircle } from 'lucide-react';

export const CompaniesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
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
      setError('Failed to load companies. Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleStartInterview = async (company) => {
    try {
      setStartingCompanyId(company.id);
      const session = await interviewsApi.createInterview(company.id);
      navigate(`/interview/${session.id}`);
    } catch (err) {
      console.error('Failed to create interview session:', err);
      const msg = err.response?.data?.detail || 'Could not start interview session. Please try again.';
      alert(msg);
      setStartingCompanyId(null);
    }
  };

  const handleCompanyAdded = (newCompany) => {
    // Inserts new card at the beginning without page reload!
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header with Title and + New Company button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-dark-border">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-brand-400 mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Candidate Dashboard • {user?.name || 'Candidate'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Target Companies
          </h1>
          <p className="text-xs sm:text-sm text-dark-muted mt-1">
            Select a company card to begin a voice interview calibrated to their hiring bar and evaluation style.
          </p>
        </div>

        {/* + New Company button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-bg font-bold text-xs shadow-lg shadow-brand-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Company</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by company name, industry, or tech stack..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-card border border-dark-border focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-xs text-white placeholder-dark-muted transition-colors"
          />
        </div>

        {/* Difficulty Pill Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-dark-muted font-medium mr-1.5 hidden sm:inline">Tier:</span>
          {['All', 'Elite', 'Hard', 'Medium', 'Easy'].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedDifficulty(tier)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                selectedDifficulty === tier
                  ? 'bg-brand-500 text-dark-bg shadow-sm'
                  : 'bg-dark-elevated text-dark-muted hover:text-white border border-dark-border/80 hover:border-dark-border'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-accent-rose/10 border border-accent-rose/30 flex items-center justify-between gap-3 text-xs text-rose-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-accent-rose shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchCompanies}
            className="px-3 py-1 rounded-lg bg-accent-rose/20 hover:bg-accent-rose/30 text-rose-200 font-semibold text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Grid of Company Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-72 rounded-2xl bg-dark-card/40 border border-dark-border/50 animate-pulse p-6 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-dark-elevated" />
                <div className="w-32 h-4 rounded bg-dark-elevated" />
                <div className="w-full h-3 rounded bg-dark-elevated/60" />
                <div className="w-4/5 h-3 rounded bg-dark-elevated/60" />
              </div>
              <div className="w-full h-9 rounded-xl bg-dark-elevated" />
            </div>
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto border border-dark-border">
          <Building2 className="w-12 h-12 text-dark-muted/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Companies Match Your Search</h3>
          <p className="text-xs text-dark-muted mb-5 font-normal">
            Try adjusting your search criteria or add a custom company URL.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedDifficulty('All');
            }}
            className="px-4 py-2 rounded-xl bg-dark-elevated border border-dark-border text-xs text-white font-medium hover:bg-dark-border transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
