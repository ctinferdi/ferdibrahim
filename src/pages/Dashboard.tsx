import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

import { supabase } from '../config/supabase';
import { expenseService } from '../services/expenseService';
import { checkService } from '../services/checkService';
import { projectService } from '../services/projectService';
import { noteService, Note } from '../services/noteService';
import { Expense, Check, Project } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toTurkishUpperCase } from '../utils/stringUtils';

const Dashboard = () => {
    const { user, isSuperAdmin } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [checks, setChecks] = useState<Check[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [savingNote, setSavingNote] = useState(false);

    useEffect(() => {
        let authCtx = { accessibleIds: [] as string[], isSuperAdmin: false };

        const applyFilter = (items: any[], type: 'project'|'expense'|'check', accessibleIds: string[], isSuper: boolean) => {
            if (isSuper) return items;
            if (type === 'project') return items.filter(i => accessibleIds.includes(i.id));
            return items.filter(i => i.project_id && accessibleIds.includes(i.project_id));
        };

        const loadData = async () => {
            let accessibleIds: string[] = [];
            
            if (!isSuperAdmin && user?.id) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('accessible_projects')
                    .eq('id', user.id)
                    .single();
                accessibleIds = profile?.accessible_projects || [];
            }

            const [exps, chks, projs, nts] = await Promise.all([
                expenseService.getExpenses(),
                checkService.getChecks(),
                projectService.getProjects(),
                noteService.getNotes()
            ]);

            const filteredProjects = applyFilter(projs, 'project', accessibleIds, isSuperAdmin);
            setExpenses(applyFilter(exps, 'expense', accessibleIds, isSuperAdmin));
            setChecks(applyFilter(chks, 'check', accessibleIds, isSuperAdmin));
            setProjects(filteredProjects);
            setNotes(nts);
            setLoading(false);
            
            authCtx = { accessibleIds, isSuperAdmin };
            return authCtx;
        };

        loadData();

        const handleRefresh = () => {
            loadData();
        };

        window.addEventListener('system-refresh', handleRefresh);

        const unsubExpenses = expenseService.subscribeToExpenses((allExps) => {
            setExpenses(applyFilter(allExps, 'expense', authCtx.accessibleIds, authCtx.isSuperAdmin));
        });
        const unsubChecks = checkService.subscribeToChecks((allChecks) => {
            setChecks(applyFilter(allChecks, 'check', authCtx.accessibleIds, authCtx.isSuperAdmin));
        });
        const unsubProjects = projectService.subscribeToProjects((allProjs) => {
            setProjects(applyFilter(allProjs, 'project', authCtx.accessibleIds, authCtx.isSuperAdmin));
        });
        const unsubNotes = noteService.subscribeToNotes(setNotes);

        return () => {
            window.removeEventListener('system-refresh', handleRefresh);
            unsubExpenses();
            unsubChecks();
            unsubProjects();
            unsubNotes();
        };
    }, [user?.id, user?.email]);

    const handleAddNote = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newNote.trim() || savingNote) return;

        setSavingNote(true);

        const tempNote: Note = {
            id: 'temp-' + Date.now(),
            content: toTurkishUpperCase(newNote),
            user_id: user?.id || '',
            created_at: new Date().toISOString()
        };

        setNotes(prev => [tempNote, ...prev]);
        setNewNote('');

        try {
            if (!user?.id) throw new Error('Oturum bulunamadı');
            await noteService.addNote(newNote, user.id);
        } catch (error) {
            console.error('Note add error:', error);
            setNotes(prev => prev.filter(n => n.id !== tempNote.id));
        } finally {
            setSavingNote(false);
        }
    };

    const handleDeleteNote = async (id: string) => {
        try {
            await noteService.deleteNote(id);
            noteService.getNotes().then(setNotes);
        } catch (error) {
            console.error('Note delete error:', error);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0
        }).format(amount);
    };

    // Ana sayfa bütün erişilebilir projelerin verilerini birlikte gösterir.
    const displayExpenses = expenses;
    const displayChecks = checks;

    const pendingChecks = displayChecks.filter(c => c.status === 'pending');
    const totalCheckAmount = pendingChecks.reduce((sum, c) => sum + c.amount, 0);
    const totalExpenseAmount = displayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const upcomingChecks = displayChecks.filter(c => c.status === 'pending' && new Date(c.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

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
                {/* ─── ÜST İSTATİSTİK KARTLARI ─── */}
                <div className="dashboard-stats-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-sm)'
                }}>
                    {/* Aktif projeler */}
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
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>🏗️</div>
                            <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-xs)', marginBottom: '0.2rem', fontWeight: 700 }}>
                                AKTİF PROJELER
                            </h3>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                                {projects.filter(p => p.status === 'active').length}
                            </div>
                            <p style={{ marginTop: '0.5rem', marginBottom: 0, opacity: 0.9, fontSize: 'var(--font-size-xs)' }}>
                                Toplam {projects.length} proje • Projeler ↗
                            </p>
                    </Link>

                    {/* 2. Bekleyen Çekler Kartı */}
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
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>💳</div>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-xs)', marginBottom: '0.2rem', fontWeight: 700, textTransform: 'uppercase' }}>
                            BEKLEYEN ÇEKLER
                        </h3>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                            {formatCurrency(totalCheckAmount)}
                        </div>
                        <p style={{ marginTop: '0.5rem', marginBottom: 0, opacity: 0.9, fontSize: 'var(--font-size-xs)' }}>
                            {pendingChecks.length} adet beklemede
                        </p>
                    </Link>

                    {/* 3. Toplam Gider Kartı */}
                    <div className="card" style={{
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        color: 'white',
                        border: 'none',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>💰</div>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-xs)', marginBottom: '0.2rem', fontWeight: 700, textTransform: 'uppercase' }}>
                            TOPLAM GİDER
                        </h3>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                            {formatCurrency(totalExpenseAmount)}
                        </div>
                        <p style={{ marginTop: '0.5rem', marginBottom: 0, opacity: 0.9, fontSize: 'var(--font-size-xs)' }}>
                            {displayExpenses.length} adet harcama kaydı
                        </p>
                    </div>
                </div>

                {/* Vadesi Yaklaşan Çekler Uyarısı */}
                {upcomingChecks.length > 0 && (
                    <div className="card shadow-md" style={{
                        background: 'linear-gradient(135deg, #FFF5F5 0%, #FFF 100%)',
                        border: '2px solid var(--color-danger)',
                        marginBottom: 'var(--spacing-md)',
                        padding: 'var(--spacing-md)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <span style={{ fontSize: '1.8rem' }}>⚠️</span>
                                <div>
                                    <h3 style={{ margin: 0, color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>
                                        Vadesi Yaklaşan Çekler!
                                    </h3>
                                    <p style={{ margin: '3px 0 0 0', color: 'var(--color-text-light)', fontSize: 'var(--font-size-xs)' }}>
                                        Önümüzdeki 7 gün içinde <strong>{upcomingChecks.length} adet</strong> çekin vadesi doluyor.
                                    </p>
                                </div>
                            </div>
                            <Link to="/cekler" className="btn btn-danger" style={{ padding: '6px 16px', fontSize: '11px', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                                Çekleri Gör
                            </Link>
                        </div>
                    </div>
                )}

                {/* ─── ALT İKİ SÜTUN: SON HAREKETLER & HIZLI NOTLAR ─── */}
                <div className="dashboard-lower-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)', alignItems: 'stretch', marginBottom: 'var(--spacing-xl)' }}>
                    {/* Son Hareketler */}
                    <div className="card" style={{ height: '100%', margin: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>SON HAREKETLER</h2>
                            </div>
                            <Link to="/projeler" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}>
                                TÜMÜNE GİT →
                            </Link>
                        </div>

                        {displayExpenses.length === 0 && displayChecks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--color-text-light)', flex: 1 }}>
                                <p style={{ fontSize: '12px' }}>
                                    Henüz kayıt bulunmuyor. Harcama veya çek ekleyerek başlayın.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', flex: 1 }}>
                                {[
                                    ...displayExpenses.map(e => ({ ...e, type: 'expense' as const })),
                                    ...displayChecks.map(c => ({ ...c, type: 'check' as const }))
                                ]
                                    .sort((a, b) => {
                                        const dateA = new Date('date' in a ? a.date : a.given_date).getTime();
                                        const dateB = new Date('date' in b ? b.date : b.given_date).getTime();
                                        return dateB - dateA;
                                    })
                                    .slice(0, 15)
                                    .map((item) => {
                                        const itemProject = projects.find(p => p.id === item.project_id);
                                        return (
                                            <div key={item.id} style={{
                                                padding: '10px var(--spacing-md)',
                                                background: 'var(--color-bg)',
                                                borderRadius: 'var(--radius-md)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderLeft: `4px solid ${item.type === 'expense' ? 'var(--color-danger)' : 'var(--color-primary)'}`,
                                                opacity: item.type === 'check' && (item as any).status === 'paid' ? 0.7 : 1
                                            }}>
                                                <div style={{ overflow: 'hidden' }}>
                                                    <div style={{ fontWeight: 700, marginBottom: '0.2rem', fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {item.type === 'expense'
                                                            ? `💰 ${(item as any).category} - ${(item as any).description || (item as any).recipient}`
                                                            : `💳 ${(item as any).company} - ${(item as any).category}`
                                                        }
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: 'var(--color-text-light)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>{itemProject?.name || 'GENEL'}</span>
                                                        <span>•</span>
                                                        <span>{new Date('date' in item ? item.date : item.given_date).toLocaleDateString('tr-TR')}</span>
                                                        {item.created_by_email && (
                                                            <>
                                                                <span>•</span>
                                                                <span style={{ fontStyle: 'italic', opacity: 0.7 }}>{item.created_by_email}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                                                    <div style={{ fontWeight: 800, color: item.type === 'expense' ? 'var(--color-danger)' : 'var(--color-primary)', fontSize: 'var(--font-size-sm)' }}>
                                                        {item.type === 'expense' ? '-' : ''}{formatCurrency(item.amount)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>

                    {/* Hızlı Notlar */}
                    <div className="card" style={{ padding: 0, height: '100%', margin: 0, display: 'flex', flexDirection: 'column', background: 'white' }}>
                        <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '12px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ opacity: 0.7 }}>📝</span> HIZLI NOTLAR
                            </h2>
                            <span style={{ fontSize: '1rem', opacity: 0.3 }}>🏗️</span>
                        </div>

                        <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border)' }}>
                            <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="YENİ NOT..."
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    style={{ borderRadius: '20px', paddingLeft: '16px', background: '#f8fafc', fontSize: '11px' }}
                                />
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={savingNote || !newNote.trim()}
                                    style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '36px' }}
                                >
                                    {savingNote ? '...' : '+'}
                                </button>
                            </form>
                        </div>

                        <div style={{ padding: 'var(--spacing-md)', overflowY: 'auto', maxHeight: '450px', flex: 1, background: '#fcfdfd' }}>
                            {notes.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: '#94a3b8', fontSize: '10px', fontWeight: 700 }}>
                                    NOT BULUNAMADI
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {notes.map(note => (
                                        <div key={note.id} style={{ padding: '10px', background: 'white', borderRadius: '10px', border: '1px solid #edf2f7', position: 'relative' }}>
                                            <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.4', paddingRight: '20px', wordBreak: 'break-word' }}>
                                                {note.content}
                                            </p>
                                            <div style={{ marginTop: '6px', opacity: 0.4, fontSize: '9px' }}>
                                                {new Date(note.created_at).toLocaleDateString('tr-TR')}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteNote(note.id)}
                                                style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.2 }}
                                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.2'}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;
