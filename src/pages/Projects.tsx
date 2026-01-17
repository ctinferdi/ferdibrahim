import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { projectService } from '../services/projectService';
import { Project, ProjectInput, ProjectPartnerInput } from '../types';

const Projects: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form states
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [partners, setPartners] = useState<Array<{ name: string; share: number }>>([
        { name: '', share: 100 }
    ]);

    useEffect(() => {
        const unsubscribe = projectService.subscribeToProjects(setProjects);
        setLoading(false);
        return unsubscribe;
    }, []);

    const addPartner = () => {
        setPartners([...partners, { name: '', share: 0 }]);
    };

    const removePartner = (index: number) => {
        setPartners(partners.filter((_, i) => i !== index));
    };

    const updatePartner = (index: number, field: 'name' | 'share', value: string | number) => {
        const updated = [...partners];
        updated[index] = { ...updated[index], [field]: value };
        setPartners(updated);
    };

    const [saving, setSaving] = useState(false);

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
                        share_percentage: Number(partner.share)
                    };
                    await projectService.addPartner(partnerInput);
                }
            }

            // Reset form
            setProjectName('');
            setProjectDescription('');
            setPartners([{ name: '', share: 100 }]);
            setShowModal(false);

            // Kullanıcının isteği üzerine sayfayı yenile
            window.location.reload();
        } catch (error: any) {
            alert('Hata: ' + error.message);
        } finally {
            setSaving(false);
        }
    };



    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingProject, setDeletingProject] = useState<{ id: string, name: string } | null>(null);
    const [deleteConfirmCode, setDeleteConfirmCode] = useState('');
    const [generatedSecurityCode, setGeneratedSecurityCode] = useState('');

    const handleDeleteProject = async () => {
        if (deleteConfirmCode === generatedSecurityCode) {
            try {
                if (deletingProject) {
                    await projectService.deleteProject(deletingProject.id);
                    const updatedProjects = await projectService.getProjects();
                    setProjects(updatedProjects);
                    alert('Proje başarıyla silindi!');
                    window.location.reload();
                }
                setShowDeleteModal(false);
                setDeleteConfirmCode('');
                setGeneratedSecurityCode('');
                setDeletingProject(null);
            } catch (error: any) {
                alert('Hata: ' + error.message);
            }
        } else {
            alert('Kod yanlış. Silme işlemi iptal edildi.');
        }
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
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                    <h1 className="mb-0">Projeler</h1>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + Yeni Proje
                    </button>
                </div>

                {/* Project Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                    gap: 'var(--spacing-lg)'
                }}>
                    {projects.map((project) => {
                        const totalPartners = project.partners?.length || 0;
                        return (
                            <div
                                key={project.id}
                                className="card"
                                onClick={() => navigate(`/projeler/${project.id}`)}
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    position: 'relative',
                                    cursor: 'pointer'
                                }}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const code = Math.floor(1000 + Math.random() * 9000).toString();
                                        setGeneratedSecurityCode(code);
                                        setDeletingProject({ id: project.id, name: project.name });
                                        setShowDeleteModal(true);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: 'var(--spacing-md)',
                                        right: 'var(--spacing-md)',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontSize: '1rem',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,0,0,0.6)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                                    title="Projeyi Sil"
                                >
                                    🗑️
                                </button>

                                <h3 style={{ color: 'white', marginBottom: 'var(--spacing-sm)', paddingRight: '2rem' }}>{project.name}</h3>
                                {project.description && (
                                    <p style={{ opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-md)' }}>
                                        {project.description}
                                    </p>
                                )}

                                <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                                    <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9 }}>
                                        {totalPartners > 0 ? (
                                            <>
                                                <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                                    👥 {totalPartners} Ortak
                                                </div>
                                                {project.partners?.map((partner) => (
                                                    <div key={partner.id} style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>
                                                        • {partner.name}: %{partner.share_percentage}
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <div>👤 Tek Sahip</div>
                                        )}
                                    </div>
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
                                            gridTemplateColumns: '1fr auto auto',
                                            gap: 'var(--spacing-sm)',
                                            marginBottom: 'var(--spacing-sm)'
                                        }}>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={partner.name}
                                                onChange={(e) => updatePartner(index, 'name', e.target.value)}
                                                placeholder="Ortak Adı (boş bırakabilirsiniz)"
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
                            <p className="mb-lg" style={{ color: 'var(--color-text-light)' }}>
                                <strong>{deletingProject?.name}</strong> projesini silmek için şu kodu girin: <strong style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>{generatedSecurityCode}</strong>
                            </p>

                            <div className="form-group">
                                <label className="form-label">GÜVENLİK KODU</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    value={deleteConfirmCode}
                                    onChange={(e) => setDeleteConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="4 haneli kodu girin"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoFocus
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
