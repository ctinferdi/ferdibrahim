import React from 'react';
import { Apartment } from '../../types';

interface FloorPlanProps {
    apartments: Apartment[];
    onApartmentClick: (apt: Apartment) => void;
}

const FloorPlan: React.FC<FloorPlanProps> = ({ apartments, onApartmentClick }) => {
    const [hoveredApt, setHoveredApt] = React.useState<Apartment | null>(null);
    const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });

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

    // Katları grupla ve sırala
    const floors = [...new Set(apartments.map(a => a.floor))].sort((a: any, b: any) => b - a);



    // Sabit daire genişliği hesapla (container genişliği - kat etiketi - boşluklar)
    // Container yaklaşık 280px, kat etiketi 50px, gap'ler için pay bırak

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
                        // Birincil: Kullanıcının belirlediği Sıra No
                        if ((a.sort_order || 0) !== (b.sort_order || 0)) {
                            return (a.sort_order || 0) - (b.sort_order || 0);
                        }
                        // İkincil: Eğer sıra noları aynıysa (varsayılan 0 ise), oluşturulma tarihine göre sabit tut
                        return (a.created_at || '').localeCompare(b.created_at || '') || a.id.localeCompare(b.id);
                    });

                return (
                    <div key={floor} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Kat Etiketi */}
                        <div style={{
                            width: '80px',
                            minWidth: '80px',
                            fontSize: '9px',
                            fontWeight: 700,
                            textAlign: 'right',
                            color: 'var(--color-text-light)',
                            borderRight: '2px solid var(--color-border)',
                            paddingRight: '8px',
                            height: '35px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end'
                        }}>
                            {Number(floor) === 0 ? 'ZEMİN' : Number(floor) < 0 ? `BODRUM ${Math.abs(Number(floor))}` : `${floor}•KAT`}
                        </div>

                        {/* Daireler */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${floorApts.length}, 1fr)`,
                            gap: '4px',
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


                                return (
                                    <div
                                        key={apt.id}
                                        onClick={() => onApartmentClick(apt)}
                                        title={apt.customer_name ? `Müşteri: ${apt.customer_name}${apt.customer_phone ? ` - ${apt.customer_phone}` : ''}` : (apt.status === 'sold' ? 'Satıldı' : apt.status === 'owner' ? 'Mal Sahibi' : 'Müsait')}
                                        style={{
                                            background: bgColor,
                                            color: textColor,
                                            borderRadius: '4px',
                                            fontSize: '9px',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            border: `1px solid ${borderColor}`,
                                            height: '35px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            setHoveredApt(apt);
                                            setTooltipPos({ x: e.clientX, y: e.clientY });
                                            e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                                            e.currentTarget.style.zIndex = '10';
                                        }}
                                        onMouseMove={(e) => {
                                            setTooltipPos({ x: e.clientX, y: e.clientY });
                                        }}
                                        onMouseLeave={(e) => {
                                            setHoveredApt(null);
                                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                            e.currentTarget.style.zIndex = '1';
                                        }}
                                    >
                                        <div style={{
                                            fontWeight: 800,
                                            fontSize: '11px',
                                            lineHeight: 1.1,
                                            textAlign: 'center',
                                            padding: '0 2px',
                                            wordBreak: 'break-word'
                                        }}>
                                            {apt.status === 'common' ? 'ORTAK ALAN' : apt.apartment_number}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* Renk Açıklamaları */}
            <div style={{
                marginTop: 'var(--spacing-md)',
                padding: 'var(--spacing-sm)',
                background: 'white',
                borderRadius: '4px',
                fontSize: '9px',
                border: '1px solid var(--color-border)'
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

            {/* Floating Tooltip */}
            {hoveredApt && (
                <div style={{
                    position: 'fixed',
                    left: tooltipPos.x + 15,
                    top: tooltipPos.y + 15,
                    background: 'rgba(30, 41, 59, 0.95)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    zIndex: 99999,
                    pointerEvents: 'none',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    maxWidth: '200px'
                }}>
                    <div style={{ fontWeight: 800, marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px' }}>
                        Daire {hoveredApt.apartment_number}
                    </div>
                    {hoveredApt.customer_name ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                👤 <span style={{ fontWeight: 600 }}>{hoveredApt.customer_name}</span>
                            </div>
                            {hoveredApt.customer_phone && (
                                <div style={{ fontSize: '10px', opacity: 0.9, marginTop: '2px' }}>
                                    📞 {hoveredApt.customer_phone}
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ fontStyle: 'italic', opacity: 0.8 }}>
                            {hoveredApt.status === 'available' ? 'Müsait' :
                                hoveredApt.status === 'sold' ? 'Satıldı' :
                                    hoveredApt.status === 'owner' ? 'Mal Sahibi' : 'Ortak Alan'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FloorPlan;
