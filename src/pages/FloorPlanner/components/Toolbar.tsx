import React from 'react';

interface ToolbarProps {
    viewType: '2d' | '3d';
    onToggleViewType: (view: '2d' | '3d') => void;
    activeTool: 'select' | 'wall' | 'door' | 'window' | 'pan';
    onSelectTool: (tool: 'select' | 'wall' | 'door' | 'window' | 'pan') => void;
    onLoadSample: () => void;
    onClear: () => void;
    onSave: () => void;
    saving?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
    viewType,
    onToggleViewType,
    activeTool,
    onSelectTool,
    onLoadSample,
    onClear,
    onSave,
    saving
}) => {
    return (
        <div style={{
            height: '52px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 20
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

                <div style={{ height: '24px', width: '1px', background: '#e2e8f0', margin: '0 4px' }} />

                {/* 2D Tools (only visible in 2D mode) */}
                {viewType === '2d' && (
                    <div style={{ display: 'flex', gap: '4px' }}>
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
                        <button
                            onClick={() => onSelectTool('wall')}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: activeTool === 'wall' ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                background: activeTool === 'wall' ? '#eff6ff' : '#ffffff',
                                color: activeTool === 'wall' ? '#1d4ed8' : '#475569',
                                cursor: 'pointer'
                            }}
                            title="Tıkla ve sürükle ile duvar çiz"
                        >
                            🧱 Duvar Çiz
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
                            🚪 Kapı Ekle
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
                            🪟 Pencere Ekle
                        </button>
                        <button
                            onClick={() => onSelectTool('pan')}
                            style={{
                                padding: '6px 10px',
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
                            🖐️ Kaydır
                        </button>
                    </div>
                )}
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                    onClick={onLoadSample}
                    style={{
                        padding: '6px 12px',
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
                    ⚡ Örnek 2+1 Planı Yükle
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
                        padding: '6px 16px',
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
