import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { projectService } from '../services/projectService';
import { checkService } from '../services/checkService';
import { apartmentService } from '../services/apartmentService';
import { Project, ProjectInput, ProjectPartnerInput, Check, Apartment } from '../types';
import { supabase } from '../config/supabase';
import { isUserSuperAdmin } from '../config/admin';

const Projects: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);

    const isSuperAdmin = isUserSuperAdmin(user?.email);

    const handleAdminAction = (action: () => void) => {
        if (!isSuperAdmin) {
            alert(`Bu işlem için yönetici onayına ihtiyaç var.`);
            return;
        }
        action();
    };

    const [checks, setChecks] = useState<Check[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form states
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [partners, setPartners] = useState<Array<{ name: string; share: number; email: string }>>([
        { name: '', share: 100, email: '' }
    ]);

    useEffect(() => {
        const init = async () => {
            try {
                const [projs, chks, apts] = await Promise.all([
                    projectService.getProjects(),
                    checkService.getChecks(),
                    apartmentService.getApartments()
                ]);

                setProjects(projs);
                setChecks(chks);
                setApartments(apts);
                setLoading(false);

            } catch (err) {
                console.error('Initialization error:', err);
                setLoading(false);
            }
        };

        init();

        const handleRefresh = () => {
            projectService.getProjects().then(setProjects);
            checkService.getChecks().then(setChecks);
            apartmentService.getApartments().then(setApartments);
        };

        window.addEventListener('system-refresh', handleRefresh);

        const unsubscribeProjects = projectService.subscribeToProjects(setProjects);
        const unsubscribeChecks = checkService.subscribeToChecks(setChecks);
        const unsubscribeApartments = apartmentService.subscribeToApartments(setApartments);

        return () => {
            window.removeEventListener('system-refresh', handleRefresh);
            unsubscribeProjects();
            unsubscribeChecks();
            unsubscribeApartments();
        };
    }, []);

    const addPartner = () => {
        setPartners([...partners, { name: '', share: 0, email: '' }]);
    };

    const removePartner = (index: number) => {
        setPartners(partners.filter((_, i) => i !== index));
    };

    const updatePartner = (index: number, field: 'name' | 'share' | 'email', value: string | number) => {
        const updated = [...partners];
        updated[index] = { ...updated[index], [field]: value };
        setPartners(updated);
    };

    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSaveProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;

        setSaving(true);
        try {
            const projectInput: ProjectInput = {
                name: projectName,
                description: projectDescription,
                status: 'active'
            };

            const newProject = await projectService.createProject(projectInput);

            // Add partners
            for (const partner of partners) {
                if (partner.name.trim()) {
                    const partnerInput: ProjectPartnerInput = {
                        project_id: newProject.id,
                        name: partner.name,
                        share_percentage: Number(partner.share),
                        email: partner.email.trim() || undefined
                    };
                    await projectService.addPartner(partnerInput);
                }
            }

            // Reset form
            setProjectName('');
            setProjectDescription('');
            setPartners([{ name: '', share: 100, email: '' }]);
            setShowModal(false);

            // Update projects list without reload
            const updatedProjects = await projectService.getProjects();
            setProjects(updatedProjects);
        } catch (error: any) {
            setErrorMsg(error.message || 'Proje oluşturulamadı.');
        } finally {
            setSaving(false);
        }
    };

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingProject, setDeletingProject] = useState<{ id: string, name: string } | null>(null);
    const [deleteConfirmCode, setDeleteConfirmCode] = useState('');
    const [receivedCode, setReceivedCode] = useState(''); // Code received from Edge Function
    const [sendingCode, setSendingCode] = useState(false);

    const triggerDeleteCode = async (project: { id: string, name: string }) => {
        setSendingCode(true);
        setDeletingProject(project);
        try {
            const { data, error } = await supabase.functions.invoke('send-delete-code', {
                body: {
                    targetName: project.name,
                    actionType: 'project',
                    userEmail: user?.email
                }
            });

            if (error) throw error;
            if (data?.code) {
                setReceivedCode(data.code);
                setShowDeleteModal(true);
            }
        } catch (error: any) {
            console.error('Full Error:', error);
            const errorMsg = error.context?.error?.message || error.message || 'Bilinmeyen bir hata oluştu';
            alert('Güvenlik kodu gönderilemedi: ' + errorMsg);
        } finally {
            setSendingCode(false);
        }
    };

    const handleDeleteProject = async () => {
        if (deleteConfirmCode === receivedCode) {
            try {
                if (deletingProject) {
                    await projectService.deleteProject(deletingProject.id);
                    const updatedProjects = await projectService.getProjects();
                    setProjects(updatedProjects);
                }
                setShowDeleteModal(false);
                setDeleteConfirmCode('');
                setReceivedCode('');
                setDeletingProject(null);
            } catch (error: any) {
                alert('Hata: ' + error.message);
            }
        } else {
            alert('Girdiğiniz kod hatalı. Lütfen mailinizi kontrol edin.');
        }
    };

    return (
        <Layout>
            {loading && <div style={{ textAlign: 'center', padding: '10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '8px', marginBottom: '10px' }}>Veriler yükleniyor...</div>}
            <div className="animate-fadeIn" style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                    <h1 className="mb-0">Projeler</h1>
                    <button className="btn btn-primary" onClick={() => {
                        setErrorMsg(null);
                        setShowModal(true);
                    }}>
                        + Yeni Proje
                    </button>
                </div>

                {/* Project Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                    gap: 'var(--spacing-md)',
                    gridAutoRows: '1fr'
                }}>
                    {(isSuperAdmin
                        ? projects
                        : projects.filter(p =>
                            p.partners?.some(partner =>
                                partner.email?.toLowerCase() === user?.email?.toLowerCase()
                            )
                        )
                    ).map((project) => {
                        const totalPartners = project.partners?.length || 0;
                        const projectChecks = checks.filter(c => c.project_id === project.id);
                        const pendingChecks = projectChecks.filter(c => c.status === 'pending').length;
                        const paidChecks = projectChecks.filter(c => c.status === 'paid').length;

                        return (
                            <div key={project.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {/* Proje Kartı */}
                                <div
                                    className="card"
                                    onClick={() => navigate(`/projeler/${project.slug || project.id}`)}
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        padding: 'var(--spacing-lg)',
                                        marginBottom: 0,
                                        minHeight: '180px',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAdminAction(() => {
                                                triggerDeleteCode({ id: project.id, name: project.name });
                                            });
                                        }}
                                        disabled={sendingCode}
                                        style={{
                                            position: 'absolute',
                                            top: 'var(--spacing-xs)',
                                            right: 'var(--spacing-xs)',
                                            background: 'rgba(255,255,255,0.2)',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '24px',
                                            height: '24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: sendingCode ? 'wait' : 'pointer',
                                            fontSize: '0.8rem',
                                            transition: 'all var(--transition-fast)',
                                            opacity: sendingCode ? 0.5 : 1
                                        }}
                                        onMouseEnter={(e) => !sendingCode && (e.currentTarget.style.background = 'rgba(255,0,0,0.6)')}
                                        onMouseLeave={(e) => !sendingCode && (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                                        title="Projeyi Sil"
                                    >
                                        {sendingCode ? '...' : '🗑️'}
                                    </button>

                                    <h3 style={{ color: 'white', marginBottom: 'var(--spacing-sm)', paddingRight: '2rem' }}>{project.name}</h3>

                                    <div style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                                        {totalPartners > 0 ? (
                                            <>
                                                <div style={{ fontWeight: 600, opacity: 0.9, marginBottom: 'var(--spacing-xs)' }}>👥 {totalPartners} Ortak</div>
                                                {project.partners?.slice(0, 3).map((partner) => (
                                                    <div key={partner.id} style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>
                                                        • {partner.name}: %{partner.share_percentage}
                                                    </div>
                                                ))}
                                                {totalPartners > 3 && <div style={{ opacity: 0.8 }}>...</div>}
                                            </>
                                        ) : (
                                            <div style={{ opacity: 0.9 }}>👤 Tek Sahip</div>
                                        )}
                                    </div>
                                </div>

                                {/* Çek Durumu Barı */}
                                <div style={{
                                    background: 'rgba(102, 126, 234, 0.15)',
                                    border: '1px solid rgba(102, 126, 234, 0.3)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '6px 10px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    color: 'var(--color-text)'
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>💳</span>
                                        <span>ÇEK: {projectChecks.length}</span>
                                    </span>
                                    <span style={{ opacity: 0.7, fontSize: '0.6rem' }}>
                                        {pendingChecks} Bekle. / {paidChecks} Öden.
                                    </span>
                                </div>

                                {/* Daire Durumu Barı */}
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/projeler/${project.slug || project.id}?tab=apartments`);
                                    }}
                                    style={{
                                        background: 'rgba(67, 233, 123, 0.15)',
                                        border: '1px solid rgba(67, 233, 123, 0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '6px 10px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        color: 'var(--color-text)',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(67, 233, 123, 0.25)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(67, 233, 123, 0.15)'}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>🏠</span>
                                        <span>DAİRE: {apartments.filter(a => a.project_id === project.id).length}</span>
                                    </span>
                                    <span style={{ opacity: 0.7, fontSize: '0.6rem' }}>
                                        {apartments.filter(a => a.project_id === project.id && a.status === 'available').length} Müsait /
                                        {apartments.filter(a => a.project_id === project.id && a.status === 'sold').length} Satıldı
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {projects.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--color-text-light)' }}>
                        <p>Henüz proje eklenmemiş. "Yeni Proje" butonuna tıklayarak başlayın.</p>
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: 'var(--spacing-md)'
                    }}>
                        <div className="card" style={{
                            maxWidth: '600px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto'
                        }} onClick={(e) => e.stopPropagation()}>
                            <h2 className="mb-lg">Yeni Proje Oluştur</h2>

                            <form onSubmit={handleSaveProject}>
                                <div className="form-group">
                                    <label className="form-label">PROJE ADI</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        placeholder="A Blok İnşaat"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">AÇIKLAMA (İsteğe Bağlı)</label>
                                    <textarea
                                        className="form-input"
                                        value={projectDescription}
                                        onChange={(e) => setProjectDescription(e.target.value)}
                                        placeholder="Proje hakkında kısa açıklama..."
                                        rows={3}
                                        style={{ resize: 'vertical' }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">ORTAKLAR VE PAY ORANLARI</label>
                                    {partners.map((partner, index) => (
                                        <div key={index} style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr auto auto',
                                            gap: 'var(--spacing-sm)',
                                            marginBottom: 'var(--spacing-sm)'
                                        }}>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={partner.name}
                                                onChange={(e) => updatePartner(index, 'name', e.target.value)}
                                                placeholder="Ortak Adı"
                                            />
                                            <input
                                                type="email"
                                                className="form-input"
                                                value={partner.email}
                                                onChange={(e) => updatePartner(index, 'email', e.target.value)}
                                                placeholder="E-posta (opsiyonel)"
                                            />
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={partner.share}
                                                onChange={(e) => updatePartner(index, 'share', e.target.value)}
                                                placeholder="%"
                                                min="0"
                                                max="100"
                                                style={{ width: '80px' }}
                                                required
                                            />
                                            {partners.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary"
                                                    onClick={() => removePartner(index)}
                                                    style={{ padding: '0.5rem 1rem' }}
                                                >
                                                    ❌
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={addPartner}
                                        style={{ marginTop: 'var(--spacing-sm)', width: '100%' }}
                                    >
                                        + Ortak Ekle
                                    </button>

                                </div>

                                {errorMsg && (
                                    <div style={{
                                        padding: '10px',
                                        background: '#fee2e2',
                                        color: '#991b1b',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        border: '1px solid #fecaca',
                                        marginBottom: '15px'
                                    }}>
                                        ⚠️ {errorMsg}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ flex: 1 }}
                                        disabled={saving}
                                    >
                                        {saving ? 'Oluşturuluyor...' : 'Oluştur'}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowModal(false)}
                                        style={{ flex: 1 }}
                                    >
                                        İptal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Project Modal */}
                {showDeleteModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: 'var(--spacing-md)'
                    }}>
                        <div className="card" style={{ maxWidth: '400px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                            <h2 className="mb-md">Projeyi Sil</h2>
                            <p className="mb-lg" style={{ color: 'var(--color-text-light)', fontSize: '14px' }}>
                                <strong>{deletingProject?.name}</strong> projesini silmek için e-posta adresinize ({user?.email}) gönderilen 4 haneli kodu girin.
                            </p>

                            <div className="form-group">
                                <label className="form-label" style={{ color: 'var(--color-primary)', fontWeight: 800 }}>KOD E-POSTA ADRESİNİZE GÖNDERİLDİ</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    value={deleteConfirmCode}
                                    onChange={(e) => setDeleteConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="4 haneli kodu girin"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoFocus
                                    style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 800 }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                                <button
                                    onClick={handleDeleteProject}
                                    className="btn btn-primary"
                                    style={{ flex: 1, backgroundColor: '#f5576c' }}
                                >
                                    Sil
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setDeleteConfirmCode('');
                                        setDeletingProject(null);
                                    }}
                                    style={{ flex: 1 }}
                                >
                                    İptal
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Projects;
