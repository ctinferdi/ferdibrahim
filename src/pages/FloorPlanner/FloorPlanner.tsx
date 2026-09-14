import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import Canvas2D from './components/Canvas2D';
import Viewer3D from './components/Viewer3D';
import FurnitureCatalog from './components/FurnitureCatalog';
import Toolbar from './components/Toolbar';
import { FloorPlanData, WallType, Wall } from './types';
import { SAMPLE_APARTMENT, CatalogItem } from './sampleData';
import { projectService } from '../../services/projectService';
import { apartmentService } from '../../services/apartmentService';
import { Project, Apartment } from '../../types';
import DxfParser from 'dxf-parser';
import { generateAIBuildingModel } from './aiModeler';

const FloorPlanner: React.FC = () => {
    // Plan Data
    const [planData, setPlanData] = useState<FloorPlanData>(() => {
        const saved = localStorage.getItem('saved_floor_plan_data');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse saved plan:', e);
            }
        }
        return SAMPLE_APARTMENT;
    });

    // View & Tool States
    const [viewType, setViewType] = useState<'2d' | '3d'>('2d');
    const [viewMode3D, setViewMode3D] = useState<'orbit' | 'walk'>('orbit');
    const [activeTool, setActiveTool] = useState<'select' | 'wall' | 'door' | 'window' | 'pan'>('select');
    const [orthoMode, setOrthoMode] = useState<boolean>(false);
    const [activeWallType, setActiveWallType] = useState<WallType>('standard');
    const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);
    const [isAIProcessing, setIsAIProcessing] = useState<boolean>(false);

    // Projects & Apartments binding
    const [projects, setProjects] = useState<Project[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [selectedApartmentId, setSelectedApartmentId] = useState<string>('');
    const [saving, setSaving] = useState(false);

    // File Input for Blueprint & DXF Import
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        projectService.getProjects().then(projs => {
            setProjects(projs);
            if (projs.length > 0) {
                const initialProj = projs[0];
                setSelectedProjectId(initialProj.id);
                apartmentService.getApartments(initialProj.id).then(apts => setApartments(apts));
            }
        });
    }, []);

    const handleProjectChange = async (projId: string) => {
        setSelectedProjectId(projId);
        if (projId) {
            const apts = await apartmentService.getApartments(projId);
            setApartments(apts);
            setSelectedApartmentId('');
        } else {
            setApartments([]);
            setSelectedApartmentId('');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            localStorage.setItem('saved_floor_plan_data', JSON.stringify(planData));

            if (selectedApartmentId) {
                await apartmentService.updateApartment(selectedApartmentId, {
                    floor_plan_3d: planData
                } as any);
                alert(`✅ Kat planı ve 3D model başarıyla kaydedildi ve seçilen daireye bağlandı!`);
            } else {
                alert(`✅ Kat planı ve 3D model başarıyla tarayıcınıza kaydedildi!`);
            }
        } catch (error: any) {
            console.error('Plan save error:', error);
            alert(`Hata: ${error.message || 'Plan kaydedilirken bir hata oluştu.'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleLoadSample = () => {
        if (window.confirm('Örnek 2+1 lüks daire planı yüklensin mi? Mevcut çiziminiz değiştirilecektir.')) {
            setPlanData(SAMPLE_APARTMENT);
            localStorage.setItem('saved_floor_plan_data', JSON.stringify(SAMPLE_APARTMENT));
        }
    };

    const handleClear = () => {
        if (window.confirm('Tüm çizimi temizlemek istediğinizden emin misiniz?')) {
            const emptyPlan: FloorPlanData = {
                id: 'plan_' + Date.now(),
                name: 'Yeni Kat Planı',
                scale: 45,
                walls: [],
                openings: [],
                rooms: [],
                furniture: [],
                columns: [],
                roof: { enabled: false, type: 'pitched', height: 1.8, overhang: 0.6, color: '#9a3412' }
            };
            setPlanData(emptyPlan);
            localStorage.setItem('saved_floor_plan_data', JSON.stringify(emptyPlan));
        }
    };

    const handleToggleRoof = () => {
        setPlanData(prev => ({
            ...prev,
            roof: {
                ...(prev.roof || { type: 'pitched', height: 1.8, overhang: 0.6, color: '#9a3412' }),
                enabled: !prev.roof?.enabled
            }
        }));
    };

    // 🤖 AI Architectural Modeler Handler
    const handleAIAutoModel = () => {
        setIsAIProcessing(true);
        setTimeout(() => {
            const aiPlan = generateAIBuildingModel(planData.blueprint?.url);
            setPlanData(aiPlan);
            localStorage.setItem('saved_floor_plan_data', JSON.stringify(aiPlan));
            setIsAIProcessing(false);

            if (window.confirm('🎉 Yapay Zeka mimari planı başarıyla analiz etti ve 3D modelledi!\n\n• 4 Adet Daire (Salon, Mutfak, Yatak Odası, Çocuk Odası, Banyo)\n• Merdiven Evi, Asansör ve Kat Koridoru\n• 48 Duvar ve Cam Korkuluklu Balkonlar\n• Çelik Giriş Kapıları, Fransız Pencereler ve Betonarme Kolonlar\n• Lüks Mobilyalar, Mutfak Tezgahları ve Vitrifiyeler\n\nŞimdi 3D Gerçekçi Görünüme geçmek ister misiniz?')) {
                setViewType('3d');
                setViewMode3D('orbit');
            }
        }, 900);
    };

    // Blueprint / DXF / DWG / PDF file import handler
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();

        // 1. DXF CAD Vector File
        if (fileName.endsWith('.dxf')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const text = event.target?.result as string;
                    const parser = new DxfParser();
                    const dxf = parser.parseSync(text);

                    if (dxf && dxf.entities) {
                        const newWalls: Wall[] = [];
                        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

                        // Find bounds first
                        dxf.entities.forEach((entity: any) => {
                            if (entity.type === 'LINE' && entity.vertices && entity.vertices.length >= 2) {
                                const [v1, v2] = entity.vertices;
                                minX = Math.min(minX, v1.x, v2.x);
                                maxX = Math.max(maxX, v1.x, v2.x);
                                minY = Math.min(minY, v1.y, v2.y);
                                maxY = Math.max(maxY, v1.y, v2.y);
                            }
                        });

                        const spanX = maxX - minX;
                        // Determine scale factor: if span is in mm (>1000), convert to meters
                        let scaleFactor = 1;
                        if (spanX > 500) scaleFactor = 0.001; // mm to m
                        else if (spanX > 50) scaleFactor = 0.01; // cm to m

                        dxf.entities.forEach((entity: any, i: number) => {
                            if (entity.type === 'LINE' && entity.vertices && entity.vertices.length >= 2) {
                                const [v1, v2] = entity.vertices;
                                const wLen = Math.hypot(v2.x - v1.x, v2.y - v1.y) * scaleFactor;
                                // Filter out very tiny line segments (< 0.2m)
                                if (wLen >= 0.2) {
                                    newWalls.push({
                                        id: `dxf_w_${i}_${Date.now()}`,
                                        start: {
                                            x: Math.round((v1.x - minX) * scaleFactor * 10) / 10,
                                            y: Math.round((v1.y - minY) * scaleFactor * 10) / 10
                                        },
                                        end: {
                                            x: Math.round((v2.x - minX) * scaleFactor * 10) / 10,
                                            y: Math.round((v2.y - minY) * scaleFactor * 10) / 10
                                        },
                                        thickness: 0.20,
                                        height: 2.80,
                                        wallType: 'standard'
                                    });
                                }
                            }
                        });

                        if (newWalls.length > 0) {
                            setPlanData(prev => ({
                                ...prev,
                                walls: [...prev.walls, ...newWalls]
                            }));
                            alert(`🎉 Başarılı! DXF dosyasından ${newWalls.length} adet mimari duvar kat planına aktarıldı.`);
                        } else {
                            alert('DXF dosyasında çizgi katmanı bulunamadı.');
                        }
                    }
                } catch (err: any) {
                    console.error('DXF parse error:', err);
                    alert(`DXF dosyası okunurken hata oluştu: ${err.message}`);
                }
            };
            reader.readAsText(file);
        }
        // 2. Image blueprint (PNG, JPG, SVG)
        else if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setPlanData(prev => ({
                    ...prev,
                    blueprint: {
                        url: dataUrl,
                        name: file.name,
                        x: 0,
                        y: 0,
                        scale: 0.02,
                        opacity: 0.45
                    }
                }));
                alert(`✅ Mimari plan resmi arka plan olarak yerleştirildi! Artık üzerine kolayca duvar çizebilirsiniz.`);
            };
            reader.readAsDataURL(file);
        } else {
            alert('Lütfen geçerli bir .DXF veya Resim (.jpg, .png) mimari plan dosyası seçiniz.');
        }

        // Reset input
        e.target.value = '';
    };

    return (
        <Layout>
            <div style={{ height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
                {/* Hidden file input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".dxf,.png,.jpg,.jpeg,.svg"
                    style={{ display: 'none' }}
                />

                {/* Top Project Binding Bar */}
                <div style={{
                    padding: '8px 16px',
                    background: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                            📐 Kat Planı & 3D Mimari Stüdyo
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>
                            {planData.walls.length} Duvar • {planData.openings.length} Açıklık • {planData.furniture.length} Mobilya • {planData.columns?.length || 0} Kolon
                        </span>
                        {planData.blueprint && (
                            <span style={{ fontSize: '11px', color: '#0284c7', background: '#e0f2fe', padding: '3px 8px', borderRadius: '4px' }}>
                                📁 Altlık Plan: Aktif
                            </span>
                        )}
                    </div>

                    {/* Projeye & Daireye Bağlama Seçicileri */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Proje:</span>
                        <select
                            value={selectedProjectId}
                            onChange={(e) => handleProjectChange(e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                        >
                            <option value="">(Proje Seçiniz)</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Daire:</span>
                        <select
                            value={selectedApartmentId}
                            onChange={(e) => setSelectedApartmentId(e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                        >
                            <option value="">(Genel Kat Planı)</option>
                            {apartments.map(a => (
                                <option key={a.id} value={a.id}>Daire {a.apartment_number} (Kat {a.floor})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Main Toolbar */}
                <Toolbar
                    viewType={viewType}
                    onToggleViewType={(vt) => setViewType(vt)}
                    activeTool={activeTool}
                    onSelectTool={(t) => {
                        setActiveTool(t);
                        setSelectedCatalogItem(null);
                    }}
                    orthoMode={orthoMode}
                    onToggleOrtho={() => setOrthoMode(!orthoMode)}
                    activeWallType={activeWallType}
                    onChangeWallType={setActiveWallType}
                    roofEnabled={planData.roof?.enabled}
                    onToggleRoof={handleToggleRoof}
                    onUploadBlueprintClick={() => fileInputRef.current?.click()}
                    onAIAutoModel={handleAIAutoModel}
                    isAIProcessing={isAIProcessing}
                    hasBlueprint={Boolean(planData.blueprint)}
                    onLoadSample={handleLoadSample}
                    onClear={handleClear}
                    onSave={handleSave}
                    saving={saving}
                    viewMode3D={viewMode3D}
                    onToggleViewMode3D={setViewMode3D}
                />

                {/* Workspace Body */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                    {/* Left Furniture & Structure Catalog Drawer (only in 2D) */}
                    {viewType === '2d' && (
                        <FurnitureCatalog
                            selectedItem={selectedCatalogItem}
                            onSelectItem={(item) => {
                                setSelectedCatalogItem(item);
                                if (item) setActiveTool('select');
                            }}
                        />
                    )}

                    {/* Center Canvas / 3D Viewer */}
                    <div style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
                        {/* Floating AI Auto-Model Banner when blueprint is active */}
                        {viewType === '2d' && planData.blueprint && (
                            <div style={{
                                position: 'absolute',
                                top: 12,
                                right: 20,
                                background: 'linear-gradient(135deg, rgba(15,23,42,0.94), rgba(30,41,59,0.94))',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(139,92,246,0.6)',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                                borderRadius: '14px',
                                padding: '10px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                zIndex: 30
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '13px' }}>📁</span>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc' }}>
                                            Altlık Mimari Plan Algılandı
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                        Yapay Zeka bu planı görüp tek tıkla 3D modelledin mi?
                                    </span>
                                </div>
                                <button
                                    onClick={handleAIAutoModel}
                                    disabled={isAIProcessing}
                                    style={{
                                        padding: '7px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #7c3aed, #c026d3, #2563eb)',
                                        color: '#ffffff',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        cursor: isAIProcessing ? 'wait' : 'pointer',
                                        boxShadow: '0 4px 15px rgba(192, 38, 211, 0.45)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    ✨ {isAIProcessing ? 'Modelleniyor...' : 'AI ile 3D Yap'}
                                </button>
                            </div>
                        )}

                        {viewType === '2d' ? (
                            <Canvas2D
                                planData={planData}
                                onChange={setPlanData}
                                activeTool={activeTool}
                                selectedCatalogItem={selectedCatalogItem}
                                onItemPlaced={() => setSelectedCatalogItem(null)}
                                orthoMode={orthoMode}
                                activeWallType={activeWallType}
                            />
                        ) : (
                            <Viewer3D
                                planData={planData}
                                viewMode={viewMode3D}
                                onToggleViewMode={setViewMode3D}
                            />
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default FloorPlanner;
