import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../index.css';

interface LayoutProps {
    children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    const { user, signOut } = useAuth();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const menuItems = [
        { path: '/', label: '📊 Dashboard', icon: '📊' },
        { path: '/harcamalar', label: '💰 Harcamalar', icon: '💰' },
        { path: '/cekler', label: '💳 Çekler', icon: '💳' },
        { path: '/daireler', label: '🏢 Daireler', icon: '🏢' },
        { path: '/ayarlar', label: '⚙️ Ayarlar', icon: '⚙️' }
    ];

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside style={{
                width: '260px',
                background: 'var(--color-white)',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                height: '100vh',
                zIndex: 100
            }}>
                {/* Logo */}
                <div style={{
                    padding: 'var(--spacing-xl)',
                    borderBottom: '1px solid var(--color-border)'
                }}>
                    <h2 style={{
                        fontSize: 'var(--font-size-lg)',
                        fontWeight: 700,
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.25rem'
                    }}>
                        Ferdi İbrahim
                    </h2>
                    <p style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-light)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        İnşaat Yönetim
                    </p>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: 'var(--spacing-md)' }}>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-md)',
                                    padding: 'var(--spacing-md)',
                                    marginBottom: 'var(--spacing-xs)',
                                    borderRadius: 'var(--radius-md)',
                                    background: isActive ? 'var(--color-primary-light)' : 'transparent',
                                    color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                                    fontWeight: isActive ? 600 : 500,
                                    fontSize: 'var(--font-size-md)',
                                    transition: 'all var(--transition-fast)',
                                    textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'var(--color-bg)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                                {item.label.replace(/[^\s]+\s/, '')}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Info & Logout */}
                <div style={{
                    padding: 'var(--spacing-lg)',
                    borderTop: '1px solid var(--color-border)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: 'var(--font-size-sm)'
                        }}>
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <p style={{
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 500,
                                color: 'var(--color-dark)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {user?.email}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="btn btn-secondary"
                        style={{ width: '100%', fontSize: 'var(--font-size-sm)' }}
                    >
                        🚪 Çıkış Yap
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{
                flex: 1,
                marginLeft: '260px',
                padding: 'var(--spacing-xl)',
                background: 'var(--color-bg)',
                minHeight: '100vh'
            }}>
                {children}
            </main>
        </div>
    );
};

export default Layout;
