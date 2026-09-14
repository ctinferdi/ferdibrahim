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

    // Proje Filtresi State
    const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
        return localStorage.getItem('dashboard_selected_project_id') || 'all';
    });

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
            
            // Eğer tek bir proje varsa veya kayıtlı seçim varsa eşle
            const saved = localStorage.getItem('dashboard_selected_project_id');
            if (saved && (saved === 'all' || filteredProjects.some((p: Project) => p.id === saved))) {
                setSelectedProjectId(saved);
            } else if (filteredProjects.length === 1) {
                setSelectedProjectId(filteredProjects[0].id);
            }

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

    const handleSelectProject = (projectId: string) => {
        setSelectedProjectId(projectId);
        localStorage.setItem('dashboard_selected_project_id', projectId);
    };

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

    // Seçili Projeye Göre Filtrelenmiş Veriler
    const selectedProject = projects.find(p => p.id === selectedProjectId);

    const displayExpenses = selectedProjectId === 'all'
        ? expenses
        : expenses.filter(e => e.project_id === selectedProjectId);

    const displayChecks = selectedProjectId === 'all'
        ? checks
        : checks.filter(c => c.project_id === selectedProjectId);

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)', flexWrap: 'wrap', gap: '8px' }}>
                    <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>Ana Sayfa</h1>
                    {selectedProject && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '4px 12px', borderRadius: '20px', border: '1px solid #c7d2fe' }}>
                                🏗️ {selectedProject.name}
                            </span>
                            <Link
                                to={`/projeler/${selectedProject.slug || selectedProject.id}`}
                                className="btn btn-primary"
                                style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                Proje Detayına Git ↗
                            </Link>
                        </div>
                    )}
                </div>

                {/* ─── PROJE FİLTRESİ / SEÇİMİ BARI ─── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginBottom: 'var(--spacing-md)',
                    padding: '8px 12px',
                    background: '#fff',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        PROJE:
                    </span>
                    <button
                        type="button"
                        onClick={() => handleSelectProject('all')}
                        style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            border: selectedProjectId === 'all' ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                            background: selectedProjectId === 'all' ? '#4f46e5' : '#f8fafc',
                            color: selectedProjectId === 'all' ? '#fff' : '#64748b',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                    >
                        🌐 TÜM PROJELER (GENEL BAKIŞ)
                    </button>
                    {projects.map((p) => {
                        const isSelected = selectedProjectId === p.id;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectProject(p.id)}
                                style={{
                                    padding: '5px 14px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    border: isSelected ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                                    background: isSelected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f8fafc',
                                    color: isSelected ? '#fff' : '#334155',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    boxShadow: isSelected ? '0 2px 6px rgba(102, 126, 234, 0.35)' : 'none'
                                }}
                            >
                                🏗️ {p.name}
                            </button>
                        );
                    })}
                </div>

                {/* ─── ÜST İSTATİSTİK KARTLARI ─── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-sm)'
                }}>
                    {/* 1. Proje Kartı */}
                    {selectedProject ? (
                        <Link to={`/projeler/${selectedProject.slug || selectedProject.id}`} className="card" style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            position: 'relative',
                            overflow: 'hidden',
                            textDecoration: 'none',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}>
                            <div>
                                <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>🏗️</div>
                                <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-xs)', marginBottom: '0.2rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                    SEÇİLİ PROJE
                                </h3>
                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {selectedProject.name}
                                </div>
                            </div>
                            <p style={{ marginTop: '0.5rem', marginBottom: 0, opacity: 0.9, fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                                {selectedProject.partners?.length ? `${selectedProject.partners.length} Ortak` : 'Tek Sahip'} • Detaylara Git ↗
                            </p>
                        </Link>
                    ) : (
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
                    )}

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
                            BEKLEYEN ÇEKLER {selectedProject ? `(${selectedProject.name})` : ''}
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
                            TOPLAM GİDER {selectedProject ? `(${selectedProject.name})` : ''}
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
                                        Vadesi Yaklaşan Çekler! {selectedProject ? `(${selectedProject.name})` : ''}
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
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)', alignItems: 'stretch', marginBottom: 'var(--spacing-xl)' }}>
                    {/* Son Hareketler */}
                    <div className="card" style={{ height: '100%', margin: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>SON HAREKETLER</h2>
                                {selectedProject && (
                                    <span style={{ fontSize: '11px', color: '#4f46e5', fontWeight: 800, background: '#eef2ff', padding: '2px 8px', borderRadius: '4px' }}>
                                        {selectedProject.name}
                                    </span>
                                )}
                            </div>
                            {selectedProject ? (
                                <Link to={`/projeler/${selectedProject.slug || selectedProject.id}`} style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}>
                                    PROJE DETAYINA GİT →
                                </Link>
                            ) : (
                                <Link to="/projeler" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}>
                                    TÜMÜNE GİT →
                                </Link>
                            )}
                        </div>

                        {displayExpenses.length === 0 && displayChecks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--color-text-light)', flex: 1 }}>
                                <p style={{ fontSize: '12px' }}>
                                    {selectedProject
                                        ? `"${selectedProject.name}" projesine ait henüz harcama veya çek kaydı bulunmuyor.`
                                        : 'Henüz kayıt bulunmuyor. Harcama veya çek ekleyerek başlayın.'}
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
