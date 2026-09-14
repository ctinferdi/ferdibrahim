import React, { useState } from 'react';
import { CATALOG_ITEMS, CatalogItem } from '../sampleData';

interface FurnitureCatalogProps {
    selectedItem: CatalogItem | null;
    onSelectItem: (item: CatalogItem | null) => void;
}

const FurnitureCatalog: React.FC<FurnitureCatalogProps> = ({
    selectedItem,
    onSelectItem
}) => {
    const [activeCategory, setActiveCategory] = useState<'all' | 'living' | 'kitchen' | 'bedroom' | 'bathroom'>('all');

    const categories = [
        { id: 'all', label: 'Tümü', icon: '✨' },
        { id: 'living', label: 'Salon', icon: '🛋️' },
        { id: 'kitchen', label: 'Mutfak', icon: '🍳' },
        { id: 'bedroom', label: 'Yatak O.', icon: '🛏️' },
        { id: 'bathroom', label: 'Banyo', icon: '🚿' }
    ];

    const filteredItems = activeCategory === 'all'
        ? CATALOG_ITEMS
        : CATALOG_ITEMS.filter(item => item.category === activeCategory);

    return (
        <div style={{
            width: '280px',
            height: '100%',
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📦 Mobilya & Tefrişat Kataloğu
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#64748b' }}>
                    Bir mobilya seçin ve plana yerleştirmek için tıklayın.
                </p>
            </div>

            {/* Category Pills */}
            <div style={{
                display: 'flex',
                gap: '4px',
                padding: '8px 12px',
                overflowX: 'auto',
                borderBottom: '1px solid #f1f5f9',
                background: '#f8fafc'
            }}>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id as any)}
                        style={{
                            padding: '4px 8px',
                            fontSize: '10px',
                            fontWeight: 700,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: activeCategory === cat.id ? '#3b82f6' : 'transparent',
                            color: activeCategory === cat.id ? '#ffffff' : '#64748b',
                            transition: 'all 0.15s'
                        }}
                    >
                        {cat.icon} {cat.label}
                    </button>
                ))}
            </div>

            {/* Item List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignContent: 'start' }}>
                {filteredItems.map(item => {
                    const isSelected = selectedItem?.type === item.type;
                    return (
                        <div
                            key={item.type}
                            onClick={() => onSelectItem(isSelected ? null : item)}
                            style={{
                                padding: '10px 8px',
                                borderRadius: '8px',
                                border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                background: isSelected ? '#eff6ff' : '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                transition: 'all 0.15s',
                                boxShadow: isSelected ? '0 2px 8px rgba(59, 130, 246, 0.2)' : '0 1px 3px rgba(0,0,0,0.02)'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                        >
                            <span style={{ fontSize: '24px', marginBottom: '4px' }}>{item.icon}</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#1e293b', lineHeight: 1.2, marginBottom: '4px' }}>
                                {item.name}
                            </span>
                            <span style={{ fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace' }}>
                                {item.width}m × {item.depth}m
                            </span>
                        </div>
                    );
                })}
            </div>

            {selectedItem && (
                <div style={{ padding: '10px', background: '#eff6ff', borderTop: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8' }}>
                        Seçili: {selectedItem.name}
                    </div>
                    <button
                        onClick={() => onSelectItem(null)}
                        style={{ padding: '2px 6px', fontSize: '10px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 800 }}
                    >
                        ✕ İptal
                    </button>
                </div>
            )}
        </div>
    );
};

export default FurnitureCatalog;
