import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { DashboardPage } from './pages/dashboard';
import { AnalyticsPage } from './pages/analytics';
import { ProjectPage } from './pages/project';
import { ReferencePage } from './pages/reference';
import { AuthPage } from './pages/auth';
import { AuthGuard } from './components/auth-guard';

console.log('App component loaded');

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="project/:id" element={<ProjectPage />} />
            <Route path="reference" element={<ReferencePage />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;