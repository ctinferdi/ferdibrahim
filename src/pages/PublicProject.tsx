import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apartmentService } from '../services/apartmentService';
import { projectService } from '../services/projectService';
import { userService } from '../services/userService';
import { Apartment, Project, ProjectImage, PlanFile, User } from '../types';

const Building3D = lazy(() => import('../components/Building3D'));
import { loadBuilding3DConfig } from './ProjectDetail/Modals/Building3DConfigModal';

const STATUS_CONFIG: Record<string, { label: string; bg: string; glow: string; text: string; dim?: boolean }> = {
    available: { label: 'MÜSAİT', bg: 'linear-gradient(135deg,#22c55e,#16a34a)', glow: '0 0 18px rgba(34,197,94,0.55)', text: '#fff' },
    sold:      { label: 'SATILDI', bg: '#1e293b', glow: 'none', text: '#475569', dim: true },
    owner:     { label: 'MAL SAHİBİ', bg: 'linear-gradient(135deg,#f59e0b,#d97706)', glow: '0 0 18px rgba(245,158,11,0.45)', text: '#fff' },
    common:    { label: 'ORTAK', bg: '#334155', glow: 'none', text: '#94a3b8', dim: true },
};

const PublicProject: React.FC = () => {
    const { publicCode } = useParams<{ publicCode: string }>();
    const [searchParams] = useSearchParams();
    const urlBw = searchParams.get('bw') ? parseFloat(searchParams.get('bw')!) : undefined;
    const urlBd = searchParams.get('bd') ? parseFloat(searchParams.get('bd')!) : undefined;
    const [project, setProject] = useState<Project | null>(null);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
    const [loading, setLoading] = useState(true);
    const [userCompany, setUserCompany] = useState<Partial<User> | null>(null);
    const [projectImages, setProjectImages] = useState<ProjectImage[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [view3D, setView3D] = useState(() => searchParams.get('view') === '3d');
    const [buildingDims, setBuildingDims] = useState<{ w?: number; d?: number }>({});

    const readDims = (projectId: string) => {
        try {
            const raw = localStorage.getItem(`building_dims_${projectId}`);
            if (!raw) return {};
            const d = JSON.parse(raw);
            return { w: (d.w && d.w >= 5) ? d.w : undefined, d: (d.d && d.d >= 4) ? d.d : undefined };
        } catch { return {}; }
    };

    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            body { margin: 0; padding: 0; }
            .apt-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
            .apt-card.available:hover { transform: translateY(-4px) scale(1.03); cursor: pointer; }
            @media (max-width: 768px) {
                .floor-row { flex-direction: column !important; }
                .floor-label-col { min-width: unset !important; width: 100% !important; min-height: 36px !important; }
                .apt-grid { flex-wrap: wrap !important; }
                .apt-card { min-width: 120px !important; }
            }
        `;
        document.head.appendChild(style);
        return () => { document.head.removeChild(style); };
    }, []);

    useEffect(() => { loadData(); }, [publicCode]);

    const loadData = async () => {
        if (!publicCode) return;
        try {
            const proj = await projectService.getProjectByPublicCode(publicCode);
            const apts = await apartmentService.getApartmentsByPublicCode(publicCode);
            setProject(proj);
            setApartments(apts);
            if (proj?.user_id) {
                try { setUserCompany(await userService.getUserProfile(proj.user_id)); } catch {}
            }
            if (proj?.id) {
                try {
                    const imgs = await projectService.getProjectImages(proj.id);
                    setProjectImages(imgs);
                } catch {}
                setBuildingDims(readDims(proj.id));
            }
        } catch (error) {
            console.error('Proje yuklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(value);

    const getFloorLabel = (floor: number) => {
        if (floor === 0) return 'ZEMİN';
        if (floor < 0) return `B${Math.abs(floor)}`;
        return `${floor}.KAT`;
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0f172a' }}>
            <div style={{ color: '#94a3b8', fontSize: '16px', letterSpacing: 2 }}>YÜKLENİYOR...</div>
        </div>
    );

    if (!project) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0f172a' }}>
            <div style={{ textAlign: 'center', color: '#fff' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏚️</div>
                <h1 style={{ color: '#ef4444' }}>Proje Bulunamadı</h1>
                <p style={{ color: '#64748b' }}>Bu proje mevcut değil veya kaldırılmış.</p>
            </div>
        </div>
    );

    const floors = [...new Set(apartments.map(a => a.floor))].sort((a, b) => b - a);
    const companyName = project.company_name || userCompany?.company_name || 'Firma Adı';
    const companyAddress = project.company_address || userCompany?.company_address;
    const companyLocation = project.company_location || userCompany?.company_location;
    const whatsappNum = project.whatsapp_number || userCompany?.whatsapp_number;

    const statBar = [
        { icon: '📊', label: 'Toplam', count: apartments.length, color: '#94a3b8' },
        { icon: '🟢', label: 'Satılık', count: apartments.filter(a => a.status === 'available').length, color: '#22c55e' },
        { icon: '🔴', label: 'Satılan', count: apartments.filter(a => a.status === 'sold').length, color: '#ef4444' },
        { icon: '🟡', label: 'Mal Sahibi', count: apartments.filter(a => a.status === 'owner').length, color: '#f59e0b' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#0f172a 0%,#1e1b4b 60%,#0f172a 100%)', overflowX: 'auto' }}>

            {/* HERO HEADER */}
            <div style={{
                background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%)',
                padding: '14px 24px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
            }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                        <span style={{ fontSize: '22px' }}>🏢</span>
                        <div>
                            <h1 style={{ margin: 0, fontSize: 'clamp(15px,2.5vw,20px)', fontWeight: 900, color: '#fff', letterSpacing: 0.5, textShadow: '0 2px 8px rgba(0,0,0,0.3)', lineHeight: 1.2 }}>
                                {companyName}
                            </h1>
                            {companyAddress && (
                                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px' }}>📍 {companyAddress}</span>
                            )}
                            {companyLocation && (
                                <a href={companyLocation} target="_blank" rel="noopener noreferrer"
                                    style={{ display: 'inline-block', marginLeft: '8px', color: 'rgba(255,255,255,0.65)', fontSize: '12px', textDecoration: 'underline' }}>
                                    🗺️ Harita
                                </a>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {statBar.map(s => (
                            <div key={s.label} style={{
                                background: 'rgba(255,255,255,0.15)',
                                backdropFilter: 'blur(8px)',
                                borderRadius: '999px',
                                padding: '5px 12px',
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: 700,
                                border: '1px solid rgba(255,255,255,0.2)',
                                display: 'flex', alignItems: 'center', gap: '5px'
                            }}>
                                <span style={{ color: s.color }}>{s.icon}</span>
                                {s.label}: <span style={{ color: s.color }}>{s.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* IMAGE GALLERY */}
            {projectImages.length > 0 && (
                <div style={{ maxWidth: '1200px', margin: '24px auto 0', padding: '0 16px' }}>
                    <div style={{
                        overflowX: 'auto',
                        display: 'flex',
                        gap: '12px',
                        paddingBottom: '8px',
                        scrollSnapType: 'x mandatory',
                    }}>
                        {projectImages.map((img, idx) => (
                            <div
                                key={img.id}
                                onClick={() => setLightboxIndex(idx)}
                                style={{
                                    flexShrink: 0,
                                    width: '260px',
                                    height: '170px',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    scrollSnapAlign: 'start',
                                    border: '2px solid #334155',
                                    transition: 'transform 0.18s ease, border-color 0.18s ease',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#6366f1'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#334155'; }}
                            >
                                <img src={img.url} alt={img.name || `Resim ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            </div>
                        ))}
                    </div>
                    <p style={{ color: '#475569', fontSize: '11px', marginTop: '6px', textAlign: 'right' }}>
                        {projectImages.length} proje resmi — büyütmek için tıkla
                    </p>
                </div>
            )}

            {/* BUILDING */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>

                <div style={{
                    background: 'linear-gradient(90deg,#334155,#475569,#334155)',
                    borderRadius: '16px 16px 0 0',
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg,transparent,#94a3b8,transparent)' }} />
                    <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 700, letterSpacing: 3, whiteSpace: 'nowrap' }}>🏗️ BİNA PLANI</span>
                    <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg,transparent,#94a3b8,transparent)' }} />

                    {/* 2D / 3D Toggle */}
                    <div style={{ display: 'flex', gap: 4, background: '#0f172a', borderRadius: 8, padding: 3, border: '1px solid #334155' }}>
                        {[{ key: false, label: '2D' }, { key: true, label: '3D' }].map(({ key, label }) => (
                            <button
                                key={String(key)}
                                onClick={() => { setView3D(key); if (key && project?.id) setBuildingDims(readDims(project.id)); }}
                                style={{
                                    padding: '4px 14px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: 1,
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    background: view3D === key ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'transparent',
                                    color: view3D === key ? '#fff' : '#64748b',
                                    transition: 'all 0.2s',
                                    boxShadow: view3D === key ? '0 2px 8px rgba(79,70,229,0.5)' : 'none',
                                }}
                            >{label}</button>
                        ))}
                    </div>
                </div>

                <div style={{ background: '#1e293b', border: '1px solid #334155', borderTop: 'none' }}>
                    {apartments.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#475569' }}>Henüz daire eklenmemiş.</div>
                    ) : view3D ? (
                        <div style={{ height: 'min(82vh, 680px)', minHeight: 500 }}>
                        <Suspense fallback={<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13, letterSpacing: 2 }}>3D YÜKLENİYOR...</div>}>
                            <Building3D
                                    apartments={apartments}
                                    onSelectApartment={setSelectedApartment}
                                    projectName={project?.name}
                                    companyName={userCompany?.company_name || undefined}
                                    buildingWidth={urlBw ?? buildingDims.w}
                                    buildingDepth={urlBd ?? buildingDims.d}
                                    config={project?.id ? loadBuilding3DConfig(project.id) : undefined}
                                />
                        </Suspense>
                        </div>
                    ) : (
                        floors.map((floor, fi) => {
                        const floorApts = apartments
                            .filter(a => a.floor === floor)
                            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                        return (
                            <div key={floor} className="floor-row" style={{
                                display: 'flex',
                                gap: '10px',
                                padding: '10px 14px',
                                borderBottom: '1px solid #334155',
                                alignItems: 'stretch',
                                background: fi === 0 ? 'rgba(99,102,241,0.06)' : 'transparent',
                            }}>
                                <div className="floor-label-col" style={{
                                    minWidth: '70px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    letterSpacing: 1,
                                    boxShadow: '0 2px 8px rgba(79,70,229,0.4)',
                                    padding: '8px 4px',
                                    textAlign: 'center',
                                }}>
                                    {getFloorLabel(floor)}
                                </div>

                                <div className="apt-grid" style={{ display: 'flex', gap: '10px', flex: 1 }}>
                                    {floorApts.map(apt => {
                                        const cfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.available;
                                        const clickable = apt.status === 'available';
                                        return (
                                            <div
                                                key={apt.id}
                                                className={`apt-card${clickable ? ' available' : ''}`}
                                                onClick={() => clickable && setSelectedApartment(apt)}
                                                style={{
                                                    flex: '1 1 0%',
                                                    minWidth: '130px',
                                                    background: cfg.bg,
                                                    borderRadius: '10px',
                                                    padding: '12px 10px',
                                                    cursor: clickable ? 'pointer' : 'default',
                                                    boxShadow: cfg.glow,
                                                    opacity: cfg.dim ? 0.5 : 1,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '4px',
                                                    border: clickable ? '1px solid rgba(255,255,255,0.15)' : '1px solid #2d3748',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                {clickable && (
                                                    <div style={{
                                                        position: 'absolute', top: 0, left: '-50%',
                                                        width: '30%', height: '100%',
                                                        background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)',
                                                        transform: 'skewX(-20deg)',
                                                        pointerEvents: 'none'
                                                    }} />
                                                )}
                                                <div style={{ fontSize: '13px', fontWeight: 800, color: cfg.text, lineHeight: 1.2 }}>
                                                    Daire {apt.apartment_number || '—'}
                                                </div>
                                                <div style={{ fontSize: '10px', color: apt.status === 'available' ? 'rgba(255,255,255,0.8)' : '#64748b' }}>
                                                    {apt.square_meters} m²
                                                </div>
                                                {apt.status === 'available' && (
                                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                                                        {formatCurrency(apt.price)}
                                                    </div>
                                                )}
                                                {apt.status === 'owner' && (
                                                    <div style={{ fontSize: '10px', color: '#fff', marginTop: '2px', opacity: 0.85 }}>MAL SAHİBİ</div>
                                                )}
                                                {apt.status === 'sold' && (
                                                    <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>SATILDI</div>
                                                )}
                                                {apt.plan_files && apt.plan_files.length > 0 && apt.status === 'available' && (
                                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                                                        📄 {apt.plan_files.length} plan
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }))}
                </div>

                <div style={{
                    background: 'linear-gradient(90deg,#1e293b,#334155,#1e293b)',
                    borderRadius: '0 0 12px 12px',
                    padding: '10px 24px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    borderTop: '2px solid #475569',
                }}>
                    <div style={{ height: '3px', width: '40px', background: '#475569', borderRadius: '2px' }} />
                    <div style={{ height: '5px', width: '60px', background: '#64748b', borderRadius: '2px' }} />
                    <div style={{ height: '3px', width: '40px', background: '#475569', borderRadius: '2px' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '24px', flexWrap: 'wrap' }}>
                    {[
                        { color: '#22c55e', label: 'Satılık — Tıkla, detay gör' },
                        { color: '#f59e0b', label: 'Mal Sahibi' },
                        { color: '#475569', label: 'Satıldı' },
                    ].map(l => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: l.color }} />
                            {l.label}
                        </div>
                    ))}
                </div>

                {whatsappNum && (
                    <div style={{ textAlign: 'center', marginTop: '32px', paddingBottom: '32px' }}>
                        <a
                            href={`https://wa.me/${whatsappNum.replace(/\D/g, '').replace(/^(0|90)?/, '90')}?text=${encodeURIComponent(`Merhaba, ${project.name} projesi hakkında bilgi almak istiyorum.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '14px 32px',
                                background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                                color: '#fff',
                                borderRadius: '999px',
                                textDecoration: 'none',
                                fontWeight: 800,
                                fontSize: '15px',
                                boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
                            }}
                        >
                            💬 WhatsApp ile İletişime Geç
                        </a>
                    </div>
                )}
            </div>

            {/* MODAL */}
            {selectedApartment && (
                <div
                    onClick={() => setSelectedApartment(null)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.75)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '20px',
                            maxWidth: '520px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                        }}
                    >
                        <div style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', padding: '24px', borderRadius: '20px 20px 0 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 700, letterSpacing: 2, marginBottom: '4px' }}>
                                        {getFloorLabel(selectedApartment.floor)}
                                    </div>
                                    <h2 style={{ margin: 0, color: '#fff', fontSize: '26px', fontWeight: 900 }}>
                                        Daire {selectedApartment.apartment_number || '—'}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setSelectedApartment(null)}
                                    style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >×</button>
                            </div>
                        </div>

                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                {[
                                    { icon: '📐', label: 'Alan', value: `${selectedApartment.square_meters} m²` },
                                    { icon: '📍', label: 'Kat', value: getFloorLabel(selectedApartment.floor) },
                                ].map(d => (
                                    <div key={d.label} style={{ background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155' }}>
                                        <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>{d.icon} {d.label}</div>
                                        <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '15px' }}>{d.value}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '10px', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
                                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>FİYAT</div>
                                <div style={{ color: '#a78bfa', fontSize: '28px', fontWeight: 900 }}>
                                    {formatCurrency(selectedApartment.price)}
                                </div>
                            </div>

                            {selectedApartment.plan_files && selectedApartment.plan_files.length > 0 && (
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 700, letterSpacing: 1, marginBottom: '10px' }}>DAİRE PLANLARI</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {selectedApartment.plan_files.map((file: PlanFile) => (
                                            <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer"
                                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', textDecoration: 'none', color: '#e2e8f0' }}>
                                                <span style={{ fontSize: '20px' }}>{file.type === 'pdf' ? '📄' : file.type === 'dwg' ? '📐' : '🖼️'}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{file.name}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{file.type?.toUpperCase()}</div>
                                                </div>
                                                <span style={{ color: '#6366f1', fontSize: '18px' }}>↗</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <a
                                href={whatsappNum
                                    ? `https://wa.me/${whatsappNum.replace(/\D/g, '').replace(/^(0|90)?/, '90')}?text=${encodeURIComponent(`Merhaba, ${project.name} projesindeki Daire ${selectedApartment.apartment_number} hakkında bilgi almak istiyorum.`)}`
                                    : '#'}
                                target={whatsappNum ? '_blank' : undefined}
                                rel="noopener noreferrer"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px', background: whatsappNum ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#334155', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontWeight: 800, fontSize: '15px', boxShadow: whatsappNum ? '0 4px 20px rgba(34,197,94,0.35)' : 'none', pointerEvents: whatsappNum ? 'auto' : 'none' }}
                            >
                                💬 WhatsApp ile İletişime Geç
                            </a>
                            {whatsappNum && (
                                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginTop: '8px' }}>{whatsappNum}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* LIGHTBOX */}
            {lightboxIndex !== null && projectImages[lightboxIndex] && (
                <div
                    onClick={() => setLightboxIndex(null)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                >
                    <button onClick={() => setLightboxIndex(null)} style={{ position: 'absolute', top: '16px', right: '20px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px' }}>×</button>
                    {lightboxIndex > 0 && (
                        <button onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }} style={{ position: 'absolute', left: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px' }}>‹</button>
                    )}
                    <img
                        src={projectImages[lightboxIndex].url}
                        alt={projectImages[lightboxIndex].name}
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }}
                    />
                    {lightboxIndex < projectImages.length - 1 && (
                        <button onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }} style={{ position: 'absolute', right: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px' }}>›</button>
                    )}
                    <div style={{ position: 'absolute', bottom: '16px', color: '#94a3b8', fontSize: '13px' }}>{lightboxIndex + 1} / {projectImages.length}</div>
                </div>
            )}
        </div>
    );
};

export default PublicProject;
