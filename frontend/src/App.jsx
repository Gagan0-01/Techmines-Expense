import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { OfficePage } from './pages/OfficePage';
import { IncomingPage } from './pages/IncomingPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { DailyPage } from './pages/DailyPage';
import { RecurringPage } from './pages/RecurringPage';
import { DocumentsPage } from './pages/DocumentsPage';

export const App = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      {/* Protected Main Ledger Routes (Exactly Four Primary Destinations + Recurring) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <OfficePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/incoming"
        element={
          <ProtectedRoute>
            <IncomingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <ExpensesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily"
        element={
          <ProtectedRoute>
            <DailyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recurring"
        element={
          <ProtectedRoute>
            <RecurringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
