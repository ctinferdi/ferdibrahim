import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apartmentService } from '../services/apartmentService';
import { projectService } from '../services/projectService';
import { userService } from '../services/userService';
import { Apartment, Project } from '../types';

const PublicProject: React.FC = () => {
    const { publicCode } = useParams<{ publicCode: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
    const [hoveredAptId, setHoveredAptId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [userCompany, setUserCompany] = useState<any>(null); // Firma bilgileri

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

            // Projenin sahibinin firma bilgilerini çek
            if (proj && proj.user_id) {
                try {
                    const companyInfo = await userService.getUserProfile(proj.user_id);
                    setUserCompany(companyInfo);
                } catch (err) {
                    console.error('Firma bilgileri yüklenemedi:', err);
                }
            }
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

    const getFloorLabel = (floor: number) => {
        if (floor === 0) return 'ZEMİN';
        if (floor < 0) return `BODRUM ${Math.abs(floor)}`;
        return `${floor}.KAT`;
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

    // Katları grupla
    const floors = [...new Set(apartments.map(a => a.floor))].sort((a, b) => b - a);

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
            {/* Header */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '24px' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                        🏢 {(project as any).company_name || userCompany?.company_name || 'Firma Adı'}
                    </h1>
                    {((project as any).company_address || userCompany?.company_address) && (
                        <p style={{ margin: 0, color: '#64748b', fontSize: '14px', marginBottom: '4px' }}>
                            📍 {(project as any).company_address || userCompany?.company_address}
                        </p>
                    )}
                    {((project as any).company_location || userCompany?.company_location) && (
                        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                            🌍 {(project as any).company_location || userCompany?.company_location}
                        </p>
                    )}
                    <div style={{ marginTop: '16px', padding: '12px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', color: '#475569' }}>
                            📊 Toplam: <strong>{apartments.length}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>
                            🏠 Satılık: <strong>{apartments.filter(a => a.status === 'available').length}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: 600 }}>
                            🤝 Satılan: <strong>{apartments.filter(a => a.status === 'sold').length}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                            🔑 Mal Sahibi: <strong>{apartments.filter(a => a.status === 'owner').length}</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floor Plan - Horizontal Layout */}
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ margin: 0, marginBottom: '20px', fontSize: '20px', fontWeight: 800 }}>🏢 Bina Planı</h2>

                    {apartments.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Henüz daire eklenmemiş.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {floors.map(floor => {
                                const floorApts = apartments.filter(a => a.floor === floor).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

                                return (
                                    <div key={floor} style={{ display: 'flex', alignItems: 'stretch', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '2px solid #e2e8f0' }}>
                                        {/* Kat Label */}
                                        <div style={{ minWidth: '100px', fontWeight: 800, fontSize: '14px', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: '12px', borderRight: '2px solid #e2e8f0' }}>
                                            {getFloorLabel(floor)}
                                        </div>

                                        {/* Daireler - Horizontal */}
                                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(200px, 1fr))`, gap: '12px', flex: 1 }}>
                                            {floorApts.map(apt => {
                                                const isAvailable = apt.status === 'available';
                                                const isHovered = hoveredAptId === apt.id;

                                                return (
                                                    <div
                                                        key={apt.id}
                                                        onClick={() => setSelectedApartment(apt)}
                                                        onMouseEnter={() => setHoveredAptId(apt.id)}
                                                        onMouseLeave={() => setHoveredAptId(null)}
                                                        style={{
                                                            background: isHovered ? (isAvailable ? '#8b5cf6' : '#64748b') : 'white',
                                                            border: `1px solid ${isHovered ? 'transparent' : (isAvailable ? '#e2e8f0' : '#cbd5e1')}`,
                                                            borderRadius: '12px',
                                                            padding: '16px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease-in-out',
                                                            position: 'relative',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            opacity: isAvailable ? 1 : 0.8,
                                                            transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                                                            boxShadow: isHovered ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none',
                                                            color: isHovered ? 'white' : 'inherit'
                                                        }}
                                                    >
                                                        {/* Badge */}
                                                        {apt.status !== 'sold' && !isHovered && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: '8px',
                                                                right: '8px',
                                                                padding: '4px 8px',
                                                                background: apt.status === 'available' ? '#10b981' : apt.status === 'owner' ? '#64748b' : '#f59e0b',
                                                                color: 'white',
                                                                fontSize: '10px',
                                                                fontWeight: 700,
                                                                borderRadius: '4px',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {apt.status === 'available' ? 'MÜSAİT' : apt.status === 'owner' ? 'MAL SAHİBİ' : 'ORTAK ALAN'}
                                                            </div>
                                                        )}

                                                        <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', marginTop: '12px' }}>
                                                            {isHovered
                                                                ? (apt.customer_name || (apt.status === 'sold' ? 'SATILDI' : apt.status === 'owner' ? 'MAL SAHİBİ' : 'MÜSAİT'))
                                                                : `Daire ${apt.apartment_number || '—'}`
                                                            }
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: isHovered ? 'rgba(255,255,255,0.8)' : '#64748b', marginBottom: '4px' }}>
                                                            📍 Kat: <strong>{getFloorLabel(apt.floor)}</strong>
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: isHovered ? 'rgba(255,255,255,0.8)' : '#64748b', marginBottom: '12px' }}>
                                                            📐 Alan: <strong>{apt.square_meters} m²</strong>
                                                        </div>
                                                        {apt.status === 'available' && (
                                                            <div style={{ fontSize: '16px', fontWeight: 700, color: isHovered ? 'white' : '#8b5cf6', marginTop: 'auto' }}>
                                                                {formatCurrency(apt.price)}
                                                            </div>
                                                        )}
                                                        {apt.plan_files && apt.plan_files.length > 0 && !isHovered && (
                                                            <div style={{ marginTop: '8px', fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                                                                📄 {apt.plan_files.length} Plan Bilgisi
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
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
                                <strong>Kat:</strong> {getFloorLabel(selectedApartment.floor)}
                            </p>
                            <p style={{ margin: '8px 0', fontSize: '14px', color: '#64748b' }}>
                                <strong>Alan:</strong> {selectedApartment.square_meters} m²
                            </p>
                            <p style={{ margin: '8px 0', fontSize: '18px', fontWeight: 700, color: '#8b5cf6' }}>
                                <strong>Fiyat:</strong> {formatCurrency(selectedApartment.price)}
                            </p>
                        </div>

                        {/* Plan Files */}
                        {selectedApartment.plan_files && selectedApartment.plan_files.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Daire Planları</h3>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {selectedApartment.plan_files.map((file: any) => (
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
                                                e.currentTarget.style.borderColor = '#8b5cf6';
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {selectedApartment.status === 'available' && (
                                <>
                                    <a
                                        href={`https://wa.me/${(() => {
                                            const cleanNumber = ((project as any).whatsapp_number || userCompany?.whatsapp_number || '').replace(/[^0-9]/g, '');
                                            const formattedNumber = cleanNumber.startsWith('90') ? cleanNumber : `90${cleanNumber}`;
                                            return formattedNumber || '905555555555';
                                        })()}?text=${encodeURIComponent(`Merhaba, ${project.name} projesindeki Daire ${selectedApartment.apartment_number} hakkında bilgi almak istiyorum.`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'block',
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

                                    {/* Telefon Numarası Gösterimi */}
                                    {((project as any).whatsapp_number || userCompany?.whatsapp_number) && (
                                        <div style={{
                                            textAlign: 'center',
                                            fontSize: '13px',
                                            color: '#64748b',
                                            fontWeight: 600
                                        }}>
                                            📞 {((project as any).whatsapp_number || userCompany?.whatsapp_number)}
                                        </div>
                                    )}
                                </>
                            )}

                            <button
                                onClick={() => setSelectedApartment(null)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
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
