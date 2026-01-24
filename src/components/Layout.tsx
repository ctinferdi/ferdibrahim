import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../index.css';

interface LayoutProps {
    children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    const { user, signOut } = useAuth();
    const location = useLocation();

    const menuItems = [
        { path: '/', label: '🏠 Ana Sayfa', icon: '🏠' },
        { path: '/projeler', label: '🏗️ Projeler', icon: '🏗️' },
        { path: '/giderler', label: '💰 Giderler', icon: '💰' },
        { path: '/cekler', label: '💳 Çekler', icon: '💳' },
        { path: '/daireler', label: '🏢 Daireler', icon: '🏢' }
    ];


    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)', overflowX: 'hidden' }}>
            {/* Sidebar */}
            <aside style={{
                width: '100px',
                background: 'var(--color-white)',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                height: '100vh',
                zIndex: 100
            }}>
                <nav style={{ flex: 1, padding: 'var(--spacing-md) 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                title={item.label}
                                to={item.path}
                                style={{
                                    width: '60px',
                                    height: '60px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 'var(--spacing-md)',
                                    borderRadius: 'var(--radius-sm)',
                                    background: isActive ? 'var(--color-primary-light)' : 'transparent',
                                    color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                                    transition: 'all var(--transition-fast)',
                                    textDecoration: 'none'
                                }}
                            >
                                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                                <span style={{ fontSize: '9px', marginTop: '2px', fontWeight: isActive ? 700 : 500, textAlign: 'center' }}>
                                    {item.label.split(' ')[1]}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Area */}
            <div style={{ flex: 1, marginLeft: '100px', display: 'flex', flexDirection: 'column' }}>
                {/* Top Header */}
                <header style={{
                    height: '50px',
                    background: 'var(--color-white)',
                    padding: '0 var(--spacing-xl)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    zIndex: 90,
                    position: 'sticky',
                    top: 0
                }}>
                    {/* Navigation Buttons (Back & Forward) */}
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <button
                            onClick={() => window.history.back()}
                            title="Geri"
                            style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'white',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                color: 'var(--color-text)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
                                e.currentTarget.style.color = 'var(--color-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                                e.currentTarget.style.color = 'var(--color-text)';
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <button
                            onClick={() => window.history.forward()}
                            title="İleri"
                            style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'white',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                color: 'var(--color-text)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
                                e.currentTarget.style.color = 'var(--color-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                                e.currentTarget.style.color = 'var(--color-text)';
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>

                    {/* Right side items */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                        {/* Settings Icon */}
                        <Link
                            to="/ayarlar"
                            title="Ayarlar"
                            style={{
                                textDecoration: 'none',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1rem',
                                transition: 'background 0.2s',
                                background: location.pathname === '/ayarlar' ? 'var(--color-bg)' : 'transparent'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg)'}
                            onMouseLeave={(e) => {
                                if (location.pathname !== '/ayarlar') {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            ⚙️
                        </Link>

                        {/* Logout Icon */}
                        <button
                            onClick={handleLogout}
                            title="Çıkış Yap"
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--color-danger)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                        </button>

                        <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 var(--spacing-xs)' }}></div>

                        {/* Logo & Email Stack (Link to Home) */}
                        <Link to="/" style={{
                            textDecoration: 'none',
                            textAlign: 'right',
                            minWidth: '110px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}>
                            <p style={{
                                fontSize: '10px',
                                color: 'var(--color-primary)',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                margin: 0,
                                fontWeight: 800,
                                lineHeight: 1
                            }}>
                                İnşaat Yönetim
                            </p>
                            <p style={{
                                fontSize: '9px',
                                color: 'var(--color-text-light)',
                                margin: '1px 0 0 0',
                                fontWeight: 500
                            }}>
                                {user?.email}
                            </p>
                        </Link>
                    </div>
                </header>

                {/* Content */}
                <main style={{ padding: 'var(--spacing-sm) var(--spacing-lg)', flex: 1 }}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
