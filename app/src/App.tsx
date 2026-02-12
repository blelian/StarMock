import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import InterviewPage from './pages/InterviewPage';
import './App.css';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/auth" />;

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/interview"
            element={
              <ProtectedRoute>
                <InterviewPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/interview" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

<<<<<<< HEAD
export default App
// Test comments for pre-commit hook
// Another test comment
// Final test comment
// Test final hook
// Test skip tests
=======
export default App;
>>>>>>> df18ae2 (feat: implement secure auth system, JWT, and Gemini-powered AI interview assistant with speech recognition)
