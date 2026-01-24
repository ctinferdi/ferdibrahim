import React from 'react';
import { Apartment } from '../../types';

interface FloorPlanProps {
    apartments: Apartment[];
    onApartmentClick: (apt: Apartment) => void;
}

const FloorPlan: React.FC<FloorPlanProps> = ({ apartments, onApartmentClick }) => {
    const [hoveredAptId, setHoveredAptId] = React.useState<string | null>(null);

    React.useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 640px) {
                .floor-plan-row {
                    flex-direction: column !important;
                    align-items: stretch !important;
                }
                .floor-plan-label {
                    border-right: none !important;
                    border-bottom: 2px solid var(--color-border) !important;
                    padding-right: 0 !important;
                    padding-bottom: 8px !important;
                    min-width: 100% !important;
                    height: auto !important;
                    justify-content: flex-start !important;
                }
                .floor-plan-grid {
                    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)) !important;
                }
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    if (apartments.length === 0) {

        return (
            <div style={{
                textAlign: 'center',
                color: 'var(--color-text-light)',
                padding: 'var(--spacing-2xl) var(--spacing-xl)',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '2px dashed #e2e8f0',
                margin: '20px'
            }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>🏢</div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: 'var(--color-dark)' }}>Henüz Daire Eklenmemiş</div>
                <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-xs)' }}>
                    Yukarıdaki <b>"Kat Planı Oluştur"</b> butonu ile toplu daire girişi yapabilirsiniz.
                </div>
            </div>
        );
    }

    const floors = [...new Set(apartments.map(a => a.floor))].sort((a: any, b: any) => b - a);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            paddingBottom: 'var(--spacing-sm)',
            maxHeight: '600px',
            overflowY: 'auto',
            overflowX: 'hidden'
        }}>
            {floors.map(floor => {
                const floorApts = apartments
                    .filter(a => a.floor === floor)
                    .sort((a, b) => {
                        if ((a.sort_order || 0) !== (b.sort_order || 0)) {
                            return (a.sort_order || 0) - (b.sort_order || 0);
                        }
                        return (a.created_at || '').localeCompare(b.created_at || '') || a.id.localeCompare(b.id);
                    });

                return (
                    <div key={floor} className="floor-plan-row" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px',
                        borderRadius: '6px',
                        background: '#f8fafc',
                        marginBottom: '4px'
                    }}>
                        <div className="floor-plan-label" style={{
                            width: '60px',
                            minWidth: '60px',
                            fontSize: '9px',
                            fontWeight: 700,
                            textAlign: 'right',
                            color: 'var(--color-text-light)',
                            borderRight: '2px solid var(--color-border)',
                            paddingRight: '8px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end'
                        }}>
                            {Number(floor) === 0 ? 'ZEMİN' : Number(floor) < 0 ? `BODRUM ${Math.abs(Number(floor))}` : `${floor}•KAT`}
                        </div>

                        <div className="floor-plan-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(45px, 1fr))',
                            gap: '6px',
                            flex: 1
                        }}>
                            {floorApts.map((apt) => {
                                let bgColor = '#f8fafc';
                                let textColor = '#64748b';
                                let borderColor = '#e2e8f0';
                                if (apt.status === 'sold') {
                                    bgColor = '#dcfce7'; textColor = '#15803d'; borderColor = '#bbf7d0';
                                } else if (apt.status === 'owner') {
                                    bgColor = '#fef9c3'; textColor = '#854d0e'; borderColor = '#fef08a';
                                } else if (apt.status === 'available') {
                                    bgColor = '#eff6ff'; textColor = '#1e40af'; borderColor = '#dbeafe';
                                } else if (apt.status === 'common') {
                                    bgColor = '#f5f3ff'; textColor = '#7c3aed'; borderColor = '#ddd6fe';
                                }

                                const isHovered = hoveredAptId === apt.id;

                                return (
                                    <div
                                        key={apt.id}
                                        onClick={() => onApartmentClick(apt)}
                                        onMouseEnter={() => setHoveredAptId(apt.id)}
                                        onMouseLeave={() => setHoveredAptId(null)}
                                        style={{
                                            background: isHovered ? (apt.status === 'available' ? '#8b5cf6' : textColor) : bgColor,
                                            color: isHovered ? 'white' : textColor,
                                            borderRadius: '4px',
                                            fontSize: isHovered ? '8px' : '9px',
                                            fontWeight: 800,
                                            cursor: (apt.status === 'sold' || apt.status === 'owner') ? 'default' : 'pointer',
                                            border: `1px solid ${isHovered && apt.status !== 'sold' && apt.status !== 'owner' ? 'transparent' : borderColor}`,
                                            height: '40px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: isHovered && apt.status !== 'sold' && apt.status !== 'owner' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
                                            transition: 'all 0.15s ease-in-out',
                                            transform: isHovered && apt.status !== 'sold' && apt.status !== 'owner' ? 'scale(1.1)' : 'scale(1)',
                                            zIndex: isHovered && apt.status !== 'sold' && apt.status !== 'owner' ? 10 : 1,
                                            textAlign: 'center'
                                        }}
                                    >
                                        <div style={{
                                            fontWeight: 800,
                                            fontSize: isHovered ? '8px' : '11px',
                                            lineHeight: 1.1,
                                            padding: '0 2px',
                                            wordBreak: 'break-word',
                                            overflow: 'hidden',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical'
                                        }}>
                                            {isHovered
                                                ? (apt.customer_name || (apt.status === 'sold' ? 'SATILDI' : apt.status === 'owner' ? 'MAL SAHİBİ' : 'MÜSAİT'))
                                                : (apt.status === 'common' ? 'ORTAK' : apt.apartment_number)
                                            }
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );

            })}

            <div style={{
                marginTop: 'var(--spacing-md)',
                padding: 'var(--spacing-sm)',
                background: 'white',
                borderRadius: '4px',
                fontSize: '9px',
                border: '1px solid var(--border-color, #e2e8f0)'
            }}>
                <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-light)' }}>BİNA PLANI RENKLERİ:</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '2px' }}></div>
                        <span>Müsait</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', background: '#fef9c3', border: '1px solid #fef08a', borderRadius: '2px' }}></div>
                        <span>Mal Sahibi</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '2px' }}></div>
                        <span>Satıldı</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '2px' }}></div>
                        <span>Ortak Alan</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FloorPlan;
