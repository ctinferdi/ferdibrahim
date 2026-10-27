import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

import { useBackgroundRefresh } from './hooks/useBackgroundRefresh';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const PublicProject = lazy(() => import('./pages/PublicProject'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Checks = lazy(() => import('./pages/Checks'));
const Apartments = lazy(() => import('./pages/Apartments'));
const Expenses = lazy(() => import('./pages/Expenses'));
const FloorPlanner = lazy(() => import('./pages/FloorPlanner/FloorPlanner'));

const RefreshManager = () => {
    useBackgroundRefresh();
    return null;
};

const NavigateWithParam = () => {
    const { publicCode } = useParams();
    return <Navigate to={`/p/${publicCode}`} replace />;
};

function App() {
    return (
        <AuthProvider>
            <RefreshManager />
            <BrowserRouter>
                <Suspense fallback={<div className="loading-container"><div className="spinner"></div></div>}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Navigate to="/login" replace />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/ayarlar"
                        element={
                            <ProtectedRoute>
                                <Settings />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/projeler"
                        element={
                            <ProtectedRoute>
                                <Projects />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/kat-plani"
                        element={
                            <ProtectedRoute>
                                <FloorPlanner />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/projeler/:id"
                        element={
                            <ProtectedRoute>
                                <ProjectDetail />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/cekler"
                        element={
                            <ProtectedRoute>
                                <Checks />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/giderler"
                        element={
                            <ProtectedRoute>
                                <Expenses />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/daireler" element={
                        <ProtectedRoute>
                            <Apartments />
                        </ProtectedRoute>
                    } />
                    {/* Public route - Redirect old long URL to new short URL */}
                    <Route
                        path="/projeler/:publicCode/public"
                        element={<NavigateWithParam />}
                    />
                    {/* Public route - Branded URL (e.g. /vadi-konutlari/p/xyz123) */}
                    <Route path="/:slug/p/:publicCode" element={<PublicProject />} />
                    <Route path="/p/:publicCode" element={<PublicProject />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </Suspense>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;

