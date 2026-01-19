import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apartmentService } from '../services/apartmentService';
import { projectService } from '../services/projectService';
import { Apartment, Project } from '../types';

const PublicProject: React.FC = () => {
    const { publicCode } = useParams<{ publicCode: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [publicCode]);

    const loadData = async () => {
        if (!publicCode) return;
        try {
            const proj = await projectService.getProjectByPublicCode(publicCode);
            const apts = await apartmentService.getApartmentsByPublicCode(publicCode);
            setProject(proj);
            setApartments(apts);
        } catch (error) {
            console.error('Proje yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0
        }).format(value);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f8fafc' }}>
                <div style={{ fontSize: '18px', color: '#64748b' }}>Yükleniyor...</div>
            </div>
        );
    }

    if (!project) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '24px', color: '#dc2626', marginBottom: '8px' }}>Proje Bulunamadı</h1>
                    <p style={{ color: '#64748b' }}>Bu proje mevcut değil veya kaldırılmış.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
            {/* Header */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '24px' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                        🏢 {project.name}
                    </h1>
                    {project.description && (
                        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{project.description}</p>
                    )}
                    <div style={{ marginTop: '16px', padding: '12px', background: '#f1f5f9', borderRadius: '8px' }}>
                        <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                            📍 Satılık Daireler: <strong>{apartments.length} Adet</strong>
                        </p>
                    </div>
                </div>
            </div>

            {/* Apartments Grid */}
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {apartments.length === 0 ? (
                    <div style={{ background: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
                        <p style={{ fontSize: '18px', color: '#64748b' }}>Şu anda satılık daire bulunmamaktadır.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                        {apartments.map(apt => (
                            <div
                                key={apt.id}
                                onClick={() => setSelectedApartment(apt)}
                                style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    border: '2px solid transparent'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                                    e.currentTarget.style.borderColor = '#667eea';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
                                        Daire {apt.apartment_number || '—'}
                                    </h3>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', background: '#d1fae5', padding: '4px 8px', borderRadius: '6px' }}>
                                        MÜSAİT
                                    </span>
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                                        📍 Kat: <strong>{apt.floor === 0 ? 'Zemin' : apt.floor < 0 ? `Bodrum ${Math.abs(apt.floor)}` : `${apt.floor}. Kat`}</strong>
                                    </p>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                        📐 Alan: <strong>{apt.square_meters} m²</strong>
                                    </p>
                                </div>
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#667eea' }}>
                                        {formatCurrency(apt.price)}
                                    </p>
                                </div>
                                {apt.plan_files && apt.plan_files.length > 0 && (
                                    <div style={{ marginTop: '12px' }}>
                                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                                            📄 {apt.plan_files.length} Plan Mevcut
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Apartment Detail Modal */}
            {selectedApartment && (
                <div
                    onClick={() => setSelectedApartment(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'white',
                            borderRadius: '16px',
                            maxWidth: '600px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            padding: '24px'
                        }}
                    >
                        <h2 style={{ margin: 0, marginBottom: '16px', fontSize: '24px', fontWeight: 800 }}>
                            Daire {selectedApartment.apartment_number || '—'}
                        </h2>
                        <div style={{ marginBottom: '20px' }}>
                            <p style={{ margin: '8px 0', fontSize: '14px', color: '#64748b' }}>
                                <strong>Kat:</strong> {selectedApartment.floor === 0 ? 'Zemin' : selectedApartment.floor < 0 ? `Bodrum ${Math.abs(selectedApartment.floor)}` : `${selectedApartment.floor}. Kat`}
                            </p>
                            <p style={{ margin: '8px 0', fontSize: '14px', color: '#64748b' }}>
                                <strong>Alan:</strong> {selectedApartment.square_meters} m²
                            </p>
                            <p style={{ margin: '8px 0', fontSize: '18px', fontWeight: 700, color: '#667eea' }}>
                                <strong>Fiyat:</strong> {formatCurrency(selectedApartment.price)}
                            </p>
                        </div>

                        {/* Plan Files */}
                        {selectedApartment.plan_files && selectedApartment.plan_files.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Daire Planları</h3>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {selectedApartment.plan_files.map(file => (
                                        <a
                                            key={file.id}
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px',
                                                background: '#f8fafc',
                                                borderRadius: '8px',
                                                textDecoration: 'none',
                                                color: '#1e293b',
                                                border: '1px solid #e2e8f0',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#f1f5f9';
                                                e.currentTarget.style.borderColor = '#667eea';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = '#f8fafc';
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                            }}
                                        >
                                            <span style={{ fontSize: '24px' }}>
                                                {file.type === 'pdf' ? '📄' : file.type === 'dwg' ? '📐' : '🖼️'}
                                            </span>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{file.name}</p>
                                                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                                    {file.type.toUpperCase()}
                                                </p>
                                            </div>
                                            <span style={{ fontSize: '20px' }}>→</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Contact Button */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <a
                                href={`https://wa.me/905555555555?text=Merhaba, ${project.name} projesindeki Daire ${selectedApartment.apartment_number} hakkında bilgi almak istiyorum.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    background: '#25D366',
                                    color: 'white',
                                    textAlign: 'center',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    fontWeight: 700,
                                    fontSize: '14px'
                                }}
                            >
                                💬 WhatsApp ile İletişime Geç
                            </a>
                            <button
                                onClick={() => setSelectedApartment(null)}
                                style={{
                                    padding: '14px 24px',
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicProject;
