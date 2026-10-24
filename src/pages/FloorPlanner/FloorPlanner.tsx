import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import Canvas2D from './components/Canvas2D';
import Viewer3D from './components/Viewer3D';
import FurnitureCatalog from './components/FurnitureCatalog';
import Toolbar from './components/Toolbar';
import { FloorPlanData, WallType } from './types';
import { SAMPLE_APARTMENT, CatalogItem } from './sampleData';
import { projectService } from '../../services/projectService';
import { apartmentService } from '../../services/apartmentService';
import { Project, Apartment } from '../../types';
import { analyzeFloorPlan, createPlanDraft, makePlanPreview, parseDxfGeometry, FloorPlanDraftInfo } from './floorPlanAI';
import { FloorPlanAIRequest } from '../../services/aiService';

type PlanSource = FloorPlanAIRequest['source'];

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
    const [pendingSource, setPendingSource] = useState<PlanSource | null>(null);
    const [analysisPreview, setAnalysisPreview] = useState<FloorPlanData | null>(null);
    const [draftInfo, setDraftInfo] = useState<FloorPlanDraftInfo | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

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
        if (analysisPreview) {
            alert('Önce AI taslağını onaylayın veya iptal edin.');
            return;
        }
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
        if (isAIProcessing) return;
        if (window.confirm('Örnek 2+1 lüks daire planı yüklensin mi? Mevcut çiziminiz değiştirilecektir.')) {
            setPlanData(SAMPLE_APARTMENT);
            setAnalysisPreview(null);
            setDraftInfo(null);
            setPendingSource(null);
            setAnalysisError(null);
            localStorage.setItem('saved_floor_plan_data', JSON.stringify(SAMPLE_APARTMENT));
        }
    };

    const handleClear = () => {
        if (isAIProcessing) return;
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
            setAnalysisPreview(null);
            setDraftInfo(null);
            setPendingSource(null);
            setAnalysisError(null);
            localStorage.setItem('saved_floor_plan_data', JSON.stringify(emptyPlan));
        }
    };

    const handleToggleRoof = () => {
        const update = (prev: FloorPlanData): FloorPlanData => ({
            ...prev,
            roof: {
                ...(prev.roof || { type: 'pitched', height: 1.8, overhang: 0.6, color: '#9a3412' }),
                enabled: !prev.roof?.enabled
            }
        });
        if (analysisPreview) setAnalysisPreview(prev => prev ? update(prev) : prev);
        else setPlanData(update);
    };

    const handleAIAutoModel = async () => {
        if (!pendingSource) {
            setAnalysisError('Önce bir PDF, DXF veya plan görseli yükleyin.');
            return;
        }
        setIsAIProcessing(true);
        setAnalysisError(null);
        setAnalysisPreview(null);
        setDraftInfo(null);
        try {
            const result = await analyzeFloorPlan({ task: 'floor-plan', source: pendingSource });
            const draft = createPlanDraft(result, pendingSource.name, planData.blueprint);
            setAnalysisPreview(draft.plan);
            setDraftInfo(draft.info);
            setViewType('2d');
        } catch (error) {
            setAnalysisError(error instanceof Error ? error.message : 'Plan analizi tamamlanamadı.');
        } finally {
            setIsAIProcessing(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isAIProcessing) return;
        const file = e.target.files?.[0];
        if (!file) return;
        setAnalysisError(null);
        setAnalysisPreview(null);
        setDraftInfo(null);
        try {
            if (file.size > 3 * 1024 * 1024) {
                throw new Error('Dosya 3 MB sınırını aşıyor. Planı küçültüp tekrar deneyin.');
            }

            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.dxf')) {
                const parsed = parseDxfGeometry(await file.text());
                setPendingSource({ kind: 'dxf', name: file.name, geometry: parsed.geometry });
                setPlanData(prev => ({
                    ...prev,
                    blueprint: { url: parsed.previewUrl, name: file.name, x: 0, y: 0, scale: parsed.previewScale, opacity: 0.45 },
                }));
            } else {
                const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');
                const mimeType = isPdf ? 'application/pdf' : file.type;
                if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
                    throw new Error('PDF, DXF, JPG, PNG veya WEBP dosyası yükleyin.');
                }
                const previewUrl = await makePlanPreview(file);
                const data = previewUrl.split(',')[1] || '';
                if (!data) throw new Error('Plan görüntüsü hazırlanamadı.');
                setPendingSource({ kind: 'media', name: file.name, mimeType: 'image/jpeg', data });
                setPlanData(prev => ({
                    ...prev,
                    blueprint: {
                        url: previewUrl,
                        name: file.name,
                        x: 0,
                        y: 0,
                        scale: 0.012,
                        opacity: 0.45,
                    },
                }));
            }
        } catch (error) {
            setPendingSource(null);
            setAnalysisError(error instanceof Error ? error.message : 'Dosya açılamadı.');
        } finally {
            e.target.value = '';
        }
    };

    const handleApplyAIPlan = () => {
        if (!analysisPreview) return;
        setPlanData(analysisPreview);
        setAnalysisPreview(null);
        setDraftInfo(null);
        setPendingSource(null);
        setAnalysisError(null);
    };

    const handleDiscardAIPlan = () => {
        setAnalysisPreview(null);
        setDraftInfo(null);
    };

    const displayedPlan = analysisPreview || planData;

    return (
        <Layout>
            <div className="floor-planner-shell" style={{ height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
                {/* Hidden file input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".dxf,.pdf,.png,.jpg,.jpeg,.webp"
                    style={{ display: 'none' }}
                />

                {/* Top Project Binding Bar */}
                <div className="floor-planner-project-bar" style={{
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
                            {displayedPlan.walls.length} Duvar • {displayedPlan.openings.length} Açıklık • {displayedPlan.furniture.length} Mobilya • {displayedPlan.columns?.length || 0} Kolon
                        </span>
                        {pendingSource && (
                            <span style={{ fontSize: '11px', color: '#0369a1', background: '#e0f2fe', padding: '3px 8px', borderRadius: '4px' }}>
                                📄 Kaynak: {pendingSource.name}
                            </span>
                        )}
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
                    roofEnabled={displayedPlan.roof?.enabled}
                    onToggleRoof={handleToggleRoof}
                    onUploadBlueprintClick={() => { if (!isAIProcessing) fileInputRef.current?.click(); }}
                    onAIAutoModel={handleAIAutoModel}
                    isAIProcessing={isAIProcessing}
                    hasPlanSource={Boolean(pendingSource)}
                    onLoadSample={handleLoadSample}
                    onClear={handleClear}
                    onSave={handleSave}
                    saving={saving}
                    viewMode3D={viewMode3D}
                    onToggleViewMode3D={setViewMode3D}
                />

                {/* Workspace Body */}
                <div className="floor-planner-workspace" style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                    {(analysisPreview || analysisError) && (
                        <div style={{
                            position: 'absolute', top: 8, left: 8, right: 8, zIndex: 40,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                            padding: '10px 12px', borderRadius: 10,
                            border: analysisError ? '1px solid #fecaca' : '1px solid #c4b5fd',
                            background: analysisError ? 'rgba(254,242,242,0.97)' : 'rgba(250,245,255,0.97)',
                            boxShadow: '0 4px 18px rgba(15,23,42,0.12)',
                        }}>
                            <div style={{ fontSize: 12, color: analysisError ? '#991b1b' : '#4c1d95', fontWeight: 700 }}>
                                {analysisError ? `⚠️ ${analysisError}` : (
                                    <>
                                        ✨ AI taslağı hazır: {analysisPreview?.walls.length} duvar, {analysisPreview?.rooms.length} oda, {analysisPreview?.openings.length} açıklık.
                                        {' '}Güven %{Math.round((draftInfo?.confidence || 0) * 100)}, ölçek %{Math.round((draftInfo?.scaleConfidence || 0) * 100)}.
                                        {draftInfo?.warnings.length ? ` ${draftInfo.warnings[0]}` : ''}
                                    </>
                                )}
                            </div>
                            {analysisPreview ? (
                                <div style={{ display: 'flex', flexShrink: 0, gap: 6 }}>
                                    <button onClick={handleDiscardAIPlan} style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}>İptal</button>
                                    <button onClick={handleApplyAIPlan} style={{ border: 0, background: '#7c3aed', color: '#fff', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontWeight: 800 }}>Taslağı Kullan</button>
                                </div>
                            ) : (
                                <button onClick={() => setAnalysisError(null)} style={{ border: 0, background: 'transparent', color: '#991b1b', cursor: 'pointer', fontWeight: 800 }}>Kapat</button>
                            )}
                        </div>
                    )}
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
                    <div className="floor-planner-canvas" style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
                        {viewType === '2d' ? (
                            <Canvas2D
                                planData={displayedPlan}
                                onChange={(nextPlan) => analysisPreview ? setAnalysisPreview(nextPlan) : setPlanData(nextPlan)}
                                activeTool={activeTool}
                                selectedCatalogItem={selectedCatalogItem}
                                onItemPlaced={() => setSelectedCatalogItem(null)}
                                orthoMode={orthoMode}
                                activeWallType={activeWallType}
                            />
                        ) : (
                            <Viewer3D
                                planData={displayedPlan}
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
