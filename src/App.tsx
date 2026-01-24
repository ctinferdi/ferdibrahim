import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import PublicProject from './pages/PublicProject';
import ResetPassword from './pages/ResetPassword';
import Checks from './pages/Checks';
import Apartments from './pages/Apartments';
import Expenses from './pages/Expenses';
import './index.css';

const NavigateWithParam = () => {
    const { publicCode } = useParams();
    return <Navigate to={`/p/${publicCode}`} replace />;
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
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
                    <Route path="/p/:publicCode" element={<PublicProject />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;

