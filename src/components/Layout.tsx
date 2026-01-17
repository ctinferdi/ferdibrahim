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
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
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
                <nav style={{ flex: 1, padding: 'var(--spacing-xl) 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                                    borderRadius: 'var(--radius-lg)',
                                    background: isActive ? 'var(--color-primary-light)' : 'transparent',
                                    color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                                    transition: 'all var(--transition-fast)',
                                    textDecoration: 'none'
                                }}
                            >
                                <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                                <span style={{ fontSize: '10px', marginTop: '4px', fontWeight: isActive ? 700 : 500, textAlign: 'center' }}>
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
                    height: '70px',
                    background: 'var(--color-white)',
                    padding: '0 var(--spacing-2xl)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 'var(--spacing-lg)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    zIndex: 90,
                    position: 'sticky',
                    top: 0
                }}>
                    {/* Settings Icon */}
                    <Link
                        to="/ayarlar"
                        title="Ayarlar"
                        style={{
                            textDecoration: 'none',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
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

                    {/* Profile Icon */}
                    <div
                        title={user?.email || ''}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '1rem',
                            boxShadow: '0 4px 10px rgba(102, 126, 234, 0.3)',
                            cursor: 'default'
                        }}
                    >
                        {user?.email?.[0].toUpperCase()}
                    </div>

                    {/* Logout Icon */}
                    <button
                        onClick={handleLogout}
                        title="Çıkış Yap"
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        🚪
                    </button>

                    <div style={{ width: '1px', height: '30px', background: 'var(--color-border)', margin: '0 var(--spacing-sm)' }}></div>

                    {/* Logo (Link to Home) */}
                    <Link to="/" style={{ textDecoration: 'none', textAlign: 'right', minWidth: '120px' }}>
                        <h2 style={{
                            fontSize: 'var(--font-size-md)',
                            fontWeight: 800,
                            background: 'var(--gradient-primary)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            margin: 0,
                            lineHeight: 1
                        }}>
                            Ferdi İbrahim
                        </h2>
                        <p style={{
                            fontSize: '9px',
                            color: 'var(--color-text-light)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            margin: '2px 0 0 0',
                            fontWeight: 600
                        }}>
                            İnşaat Yönetim
                        </p>
                    </Link>
                </header>

                {/* Content */}
                <main style={{ padding: 'var(--spacing-xl)', flex: 1 }}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
