import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { expenseService } from '../services/expenseService';
import { checkService } from '../services/checkService';
import { apartmentService } from '../services/apartmentService';
import { projectService } from '../services/projectService';
import { Expense, Check, Apartment, Project } from '../types';

const Dashboard = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [checks, setChecks] = useState<Check[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubExpenses = expenseService.subscribeToExpenses(setExpenses);
        const unsubChecks = checkService.subscribeToChecks(setChecks);
        const unsubApartments = apartmentService.subscribeToApartments(setApartments);
        const unsubProjects = projectService.subscribeToProjects(setProjects);

        setLoading(false);

        return () => {
            unsubExpenses();
            unsubChecks();
            unsubApartments();
            unsubProjects();
        };
    }, []);

    const pendingChecks = checks.filter(c => c.status === 'pending');
    const totalCheckAmount = pendingChecks.reduce((sum, c) => sum + c.amount, 0);
    const availableApartments = apartments.filter(a => a.status === 'available');

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return (
            <Layout>
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="animate-fadeIn">
                <h1 className="mb-xs" style={{ fontSize: 'var(--font-size-xl)' }}>Ana Sayfa</h1>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-sm)'
                }}>
                    {/* Projeler Kartı */}
                    <Link to="/projeler" className="card" style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        textDecoration: 'none',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏗️</div>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem', fontWeight: 600 }}>
                            AKTİF PROJELER
                        </h3>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>
                            {projects.filter(p => p.status === 'active').length}
                        </div>
                        <p style={{ marginTop: '0.5rem', opacity: 0.8, fontSize: 'var(--font-size-sm)' }}>
                            Toplam {projects.length} proje
                        </p>
                    </Link>

                    {/* Bekleyen Çekler Kartı */}
                    <Link to="/cekler" className="card" style={{
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                        border: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        textDecoration: 'none',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💳</div>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem', fontWeight: 600 }}>
                            BEKLEYEN ÇEKLER
                        </h3>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>
                            {formatCurrency(totalCheckAmount)}
                        </div>
                        <p style={{ marginTop: '0.5rem', opacity: 0.8, fontSize: 'var(--font-size-sm)' }}>
                            {pendingChecks.length} adet beklemede
                        </p>
                    </Link>

                    {/* Daireler Kartı */}
                    <Link to="/daireler" className="card" style={{
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        color: 'white',
                        border: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        textDecoration: 'none',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏢</div>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem', fontWeight: 600 }}>
                            SATILACAK DAİRELER
                        </h3>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>
                            {availableApartments.length}
                        </div>
                        <p style={{ marginTop: '0.5rem', opacity: 0.8, fontSize: 'var(--font-size-sm)' }}>
                            Toplam {apartments.length} daire
                        </p>
                    </Link>
                </div>

                {/* Vadesi Yaklaşan Çekler Uyarısı */}
                {checks.filter(c => c.status === 'pending' && new Date(c.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length > 0 && (
                    <div className="card shadow-md" style={{
                        background: 'linear-gradient(135deg, #FFF5F5 0%, #FFF 100%)',
                        border: '2px solid var(--color-danger)',
                        marginBottom: 'var(--spacing-lg)',
                        padding: 'var(--spacing-lg)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <span style={{ fontSize: '2rem' }}>⚠️</span>
                                <div>
                                    <h3 style={{ margin: 0, color: 'var(--color-danger)' }}>Vadesi Yaklaşan Çekler!</h3>
                                    <p style={{ margin: '5px 0 0 0', color: 'var(--color-text-light)' }}>
                                        Önümüzdeki 7 gün içinde <strong>{checks.filter(c => c.status === 'pending' && new Date(c.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length} adet</strong> çekin vadesi doluyor.
                                    </p>
                                </div>
                            </div>
                            <a
                                href="/cekler"
                                className="btn btn-danger"
                                style={{ padding: '8px 20px', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}
                            >
                                Çekleri Gör
                            </a>
                        </div>
                    </div>
                )}

                <div className="card">
                    <h2 className="mb-lg">Son Hareketler</h2>

                    {expenses.length === 0 && checks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--color-text-light)' }}>
                            <p>Henüz kayıt bulunmuyor. Harcama veya çek ekleyerek başlayın.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {[
                                ...expenses.map(e => ({ ...e, type: 'expense' as const })),
                                ...checks.map(c => ({ ...c, type: 'check' as const }))
                            ]
                                .sort((a, b) => {
                                    const dateA = new Date('date' in a ? a.date : a.given_date).getTime();
                                    const dateB = new Date('date' in b ? b.date : b.given_date).getTime();
                                    return dateB - dateA;
                                })
                                .slice(0, 8) // Biraz daha fazla gösterelim
                                .map((item) => (
                                    <div key={item.id} style={{
                                        padding: 'var(--spacing-md)',
                                        background: 'var(--color-bg)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderLeft: `4px solid ${item.type === 'expense' ? 'var(--color-danger)' : 'var(--color-primary)'}`,
                                        opacity: item.type === 'check' && (item as any).status === 'paid' ? 0.7 : 1
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                                {item.type === 'expense'
                                                    ? `💰 Gider: ${(item as any).category} - ${(item as any).description || (item as any).recipient}`
                                                    : `💳 Çek: ${(item as any).company} - ${(item as any).category}`
                                                }
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)', display: 'flex', gap: 'var(--spacing-sm)' }}>
                                                <span>{new Date('date' in item ? item.date : item.given_date).toLocaleDateString('tr-TR')}</span>
                                                {item.created_by_email && (
                                                    <>
                                                        <span>•</span>
                                                        <span style={{ fontStyle: 'italic', opacity: 0.8 }}>{item.created_by_email}</span>
                                                    </>
                                                )}
                                                {item.type === 'check' && (item as any).status === 'paid' && (
                                                    <>
                                                        <span>•</span>
                                                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>ÖDENDİ</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 700, color: item.type === 'expense' ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                                            {item.type === 'expense' ? '-' : ''}{formatCurrency(item.amount)}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;
