import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Canvas2D from './components/Canvas2D';
import Viewer3D from './components/Viewer3D';
import FurnitureCatalog from './components/FurnitureCatalog';
import Toolbar from './components/Toolbar';
import { FloorPlanData } from './types';
import { SAMPLE_APARTMENT, CatalogItem } from './sampleData';
import { projectService } from '../../services/projectService';
import { apartmentService } from '../../services/apartmentService';
import { Project, Apartment } from '../../types';

const FloorPlanner: React.FC = () => {
    // Plan Data (Loaded from LocalStorage or Sample)
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

    // View Type & Modes
    const [viewType, setViewType] = useState<'2d' | '3d'>('2d');
    const [viewMode3D, setViewMode3D] = useState<'orbit' | 'walk'>('orbit');
    const [activeTool, setActiveTool] = useState<'select' | 'wall' | 'door' | 'window' | 'pan'>('select');
    const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);

    // Projects and Apartments for binding
    const [projects, setProjects] = useState<Project[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [selectedApartmentId, setSelectedApartmentId] = useState<string>('');
    const [saving, setSaving] = useState(false);

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
            // Save to LocalStorage
            localStorage.setItem('saved_floor_plan_data', JSON.stringify(planData));

            // If an apartment is selected, attach floor plan data
            if (selectedApartmentId) {
                await apartmentService.updateApartment(selectedApartmentId, {
                    // Stored in JSON
                    floor_plan_3d: planData
                } as any);
                alert(`✅ Kat planı başarıyla kaydedildi ve seçilen daireye bağlandı!`);
            } else {
                alert(`✅ Kat planı başarıyla kaydedildi!`);
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
                furniture: []
            };
            setPlanData(emptyPlan);
            localStorage.setItem('saved_floor_plan_data', JSON.stringify(emptyPlan));
        }
    };

    return (
        <Layout>
            <div style={{ height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
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
                            📐 3D Kat Planı & İç Mekan Stüdyosu
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>
                            {planData.walls.length} Duvar • {planData.openings.length} Açıklık • {planData.furniture.length} Mobilya
                        </span>
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
                    onLoadSample={handleLoadSample}
                    onClear={handleClear}
                    onSave={handleSave}
                    saving={saving}
                />

                {/* Workspace Body */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                    {/* Left Furniture Catalog Drawer (only in 2D or toggled) */}
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
                        {viewType === '2d' ? (
                            <Canvas2D
                                planData={planData}
                                onChange={setPlanData}
                                activeTool={activeTool}
                                selectedCatalogItem={selectedCatalogItem}
                                onItemPlaced={() => setSelectedCatalogItem(null)}
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
