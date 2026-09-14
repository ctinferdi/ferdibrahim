import React from 'react';
import { WallType } from '../types';

interface ToolbarProps {
    viewType: '2d' | '3d';
    onToggleViewType: (view: '2d' | '3d') => void;
    activeTool: 'select' | 'wall' | 'door' | 'window' | 'pan';
    onSelectTool: (tool: 'select' | 'wall' | 'door' | 'window' | 'pan') => void;
    orthoMode: boolean;
    onToggleOrtho: () => void;
    activeWallType: WallType;
    onChangeWallType: (type: WallType) => void;
    roofEnabled?: boolean;
    onToggleRoof?: () => void;
    onUploadBlueprintClick: () => void;
    onAIAutoModel?: () => void;
    isAIProcessing?: boolean;
    hasBlueprint?: boolean;
    onLoadSample: () => void;
    onClear: () => void;
    onSave: () => void;
    saving?: boolean;
    viewMode3D?: 'orbit' | 'walk';
    onToggleViewMode3D?: (mode: 'orbit' | 'walk') => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
    viewType,
    onToggleViewType,
    activeTool,
    onSelectTool,
    orthoMode,
    onToggleOrtho,
    activeWallType,
    onChangeWallType,
    roofEnabled,
    onToggleRoof,
    onUploadBlueprintClick,
    onAIAutoModel,
    isAIProcessing,
    hasBlueprint,
    onLoadSample,
    onClear,
    onSave,
    saving,
    viewMode3D,
    onToggleViewMode3D
}) => {
    return (
        <div style={{
            height: '54px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 20,
            gap: '8px',
            flexWrap: 'wrap'
        }}>
            {/* Left: 2D / 3D Mode Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                    <button
                        onClick={() => onToggleViewType('2d')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            background: viewType === '2d' ? '#ffffff' : 'transparent',
                            color: viewType === '2d' ? '#2563eb' : '#64748b',
                            boxShadow: viewType === '2d' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s'
                        }}
                    >
                        📐 2D Çizim Planı
                    </button>
                    <button
                        onClick={() => onToggleViewType('3d')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            background: viewType === '3d' ? '#ffffff' : 'transparent',
                            color: viewType === '3d' ? '#2563eb' : '#64748b',
                            boxShadow: viewType === '3d' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s'
                        }}
                    >
                        🏢 3D Gerçekçi Görünüm
                    </button>
                </div>

                <div style={{ height: '24px', width: '1px', background: '#e2e8f0', margin: '0 2px' }} />

                {/* 2D Tools */}
                {viewType === '2d' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <button
                            onClick={() => onSelectTool('select')}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: activeTool === 'select' ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                background: activeTool === 'select' ? '#eff6ff' : '#ffffff',
                                color: activeTool === 'select' ? '#1d4ed8' : '#475569',
                                cursor: 'pointer'
                            }}
                            title="Nesneleri seç, taşı, döndür"
                        >
                            ✋ Seç & Taşı
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                            <button
                                onClick={() => onSelectTool('wall')}
                                style={{
                                    padding: '6px 10px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    border: 'none',
                                    borderRight: '1px solid #cbd5e1',
                                    background: activeTool === 'wall' ? '#3b82f6' : 'transparent',
                                    color: activeTool === 'wall' ? '#ffffff' : '#334155',
                                    cursor: 'pointer'
                                }}
                                title="Tıkla ve sürükle ile duvar çiz"
                            >
                                🧱 Duvar Çiz
                            </button>

                            {/* Duvar Tipi Seçimi */}
                            <select
                                value={activeWallType}
                                onChange={(e) => onChangeWallType(e.target.value as WallType)}
                                style={{
                                    padding: '5px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#1e293b',
                                    cursor: 'pointer'
                                }}
                                title="Çizilecek duvar veya balkon tipi"
                            >
                                <option value="standard">Standart Duvar (20cm)</option>
                                <option value="balcony_glass">🪟 Cam Korkuluklu Balkon</option>
                                <option value="balcony_railing">⛓️ Ferforje Korkuluklu Balkon</option>
                                <option value="low_wall">🧱 Alçak Parapet (1m)</option>
                            </select>
                        </div>

                        {/* Ortho Lock Toggle */}
                        <button
                            onClick={onToggleOrtho}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 800,
                                border: orthoMode ? '1px solid #10b981' : '1px solid #e2e8f0',
                                background: orthoMode ? '#ecfdf5' : '#ffffff',
                                color: orthoMode ? '#059669' : '#64748b',
                                cursor: 'pointer'
                            }}
                            title="Dik Açı Kilidi (Shift tuşuyla da kilitlenebilir)"
                        >
                            📐 Ortho (90°): {orthoMode ? 'AÇIK' : 'KAPALI'}
                        </button>

                        <button
                            onClick={() => onSelectTool('door')}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: activeTool === 'door' ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                background: activeTool === 'door' ? '#eff6ff' : '#ffffff',
                                color: activeTool === 'door' ? '#1d4ed8' : '#475569',
                                cursor: 'pointer'
                            }}
                            title="Duvarın üzerine kapı yerleştir"
                        >
                            🚪 Kapı
                        </button>
                        <button
                            onClick={() => onSelectTool('window')}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: activeTool === 'window' ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                background: activeTool === 'window' ? '#eff6ff' : '#ffffff',
                                color: activeTool === 'window' ? '#1d4ed8' : '#475569',
                                cursor: 'pointer'
                            }}
                            title="Duvarın üzerine pencere yerleştir"
                        >
                            🪟 Pencere
                        </button>
                        <button
                            onClick={() => onSelectTool('pan')}
                            style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: activeTool === 'pan' ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                background: activeTool === 'pan' ? '#eff6ff' : '#ffffff',
                                color: activeTool === 'pan' ? '#1d4ed8' : '#475569',
                                cursor: 'pointer'
                            }}
                            title="Çizim alanını kaydır"
                        >
                            🖐️
                        </button>
                    </div>
                )}

                {/* 3D Mode Controls */}
                {viewType === '3d' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                            onClick={() => onToggleViewMode3D && onToggleViewMode3D('orbit')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: viewMode3D === 'orbit' ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                background: viewMode3D === 'orbit' ? '#eff6ff' : '#ffffff',
                                color: viewMode3D === 'orbit' ? '#1d4ed8' : '#475569',
                                cursor: 'pointer'
                            }}
                        >
                            🛰️ Kuşbakışı / Orbit
                        </button>
                        <button
                            onClick={() => onToggleViewMode3D && onToggleViewMode3D('walk')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: viewMode3D === 'walk' ? '1px solid #10b981' : '1px solid #e2e8f0',
                                background: viewMode3D === 'walk' ? '#ecfdf5' : '#ffffff',
                                color: viewMode3D === 'walk' ? '#059669' : '#475569',
                                cursor: 'pointer'
                            }}
                            title="Daire içinde WASD tuşları ile birinci şahıs gezin"
                        >
                            🚶 Daire İçi Gezinti (WASD)
                        </button>

                        {onToggleRoof && (
                            <button
                                onClick={onToggleRoof}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    border: roofEnabled ? '1px solid #b45309' : '1px solid #e2e8f0',
                                    background: roofEnabled ? '#fef3c7' : '#ffffff',
                                    color: roofEnabled ? '#92400e' : '#475569',
                                    cursor: 'pointer'
                                }}
                            >
                                🏠 Çatı: {roofEnabled ? 'Görünür' : 'Gizli'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {onAIAutoModel && (
                    <button
                        onClick={onAIAutoModel}
                        disabled={isAIProcessing}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            border: 'none',
                            background: 'linear-gradient(135deg, #7c3aed, #c026d3, #2563eb)',
                            color: '#ffffff',
                            cursor: isAIProcessing ? 'wait' : 'pointer',
                            boxShadow: '0 2px 10px rgba(192, 38, 211, 0.45)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                        title="Yapay zeka yüklü mimari planı analiz edip otomatik olarak tüm duvarları, kapıları, pencereleri ve mobilyaları 3D modeller"
                    >
                        ✨ {isAIProcessing ? 'Yapay Zeka Modelliyor...' : 'AI ile Otomatik 3D Modelle'}
                    </button>
                )}

                <button
                    onClick={onUploadBlueprintClick}
                    style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                    title="Bilgisayarınızdan DXF, DWG, PDF veya Resim formatında mimari plan yükleyin"
                >
                    📁 Plan / DXF Yükle
                </button>
                <button
                    onClick={onLoadSample}
                    style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: '1px solid #c7d2fe',
                        background: '#eef2ff',
                        color: '#4f46e5',
                        cursor: 'pointer'
                    }}
                    title="Hazır modellenmiş 2+1 lüks daire planını yükler"
                >
                    ⚡ Örnek Plan
                </button>
                <button
                    onClick={onClear}
                    style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: '1px solid #fecaca',
                        background: '#fff5f5',
                        color: '#dc2626',
                        cursor: 'pointer'
                    }}
                    title="Çizimi sıfırla"
                >
                    🧹 Temizle
                </button>
                <button
                    onClick={onSave}
                    disabled={saving}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        border: 'none',
                        background: '#10b981',
                        color: '#ffffff',
                        cursor: saving ? 'wait' : 'pointer',
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                    }}
                >
                    {saving ? 'Kaydediliyor...' : '💾 Planı Kaydet'}
                </button>
            </div>
        </div>
    );
};

export default Toolbar;
