import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import CompaniesPage from './pages/CompaniesPage';
import InterviewPage from './pages/InterviewPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-dark-bg text-dark-text flex flex-col font-sans selection:bg-brand-500 selection:text-dark-bg">
          <Navbar />
          <main className="flex-1 flex flex-col">
            <Routes>
              {/* Public Resume Upload & Auth Screen */}
              <Route path="/resume" element={<LandingPage />} />
              <Route path="/" element={<Navigate to="/resume" replace />} />

              {/* Protected Routes */}
              <Route
                path="/companies"
                element={
                  <ProtectedRoute>
                    <CompaniesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview/:id"
                element={
                  <ProtectedRoute>
                    <InterviewPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/resume" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
