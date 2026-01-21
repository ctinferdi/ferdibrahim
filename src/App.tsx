import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import './index.css';

function App() {
    // Sayfa yenilendiğinde aynı sayfada kalsın, ancak tarayıcı kapatılıp açıldığında (yeni session) 
    // her zaman ana sayfaya (Dashboard) yönlendirsin.
    React.useEffect(() => {
        const isSessionActive = sessionStorage.getItem('session_active');
        const isPublicRoute = window.location.pathname.includes('/public') || window.location.pathname.includes('/reset-password');

        if (!isSessionActive && !isPublicRoute) {
            // Yeni bir session başladıysa veya tarayıcı/bilgisayar yeni açıldıysa
            if (window.location.pathname !== '/' && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                window.location.href = '/';
            }
            sessionStorage.setItem('session_active', 'true');
        }
    }, []);

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
                    <Route path="/daireler" element={
                        <ProtectedRoute>
                            <Apartments />
                        </ProtectedRoute>
                    } />
                    {/* Public route - no auth required */}
                    <Route path="/projeler/:publicCode/public" element={<PublicProject />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
