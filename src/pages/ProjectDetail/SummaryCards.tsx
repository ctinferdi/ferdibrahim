import React from 'react';
import { Project } from '../../types';

interface SummaryCardsProps {
    activeTab: 'expenses' | 'checks' | 'apartments';
    generalTotal: number;
    project: Project;
    getPartnerTotal: (partnerId: string) => number;
    aptStats: {
        total: number;
        soldCount: number;
        ownerCount: number;
        totalSoldPrice: number;
        totalPaidAmount: number;
    };
    formatCurrency: (value: number) => string;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({
    activeTab,
    generalTotal,
    project,
    getPartnerTotal,
    aptStats,
    formatCurrency
}) => {
    const totalRemaining = aptStats.totalSoldPrice - aptStats.totalPaidAmount;

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--spacing-sm)',
            marginBottom: 'var(--spacing-xs)',
            width: '100%',
            maxWidth: '900px' // Slightly wider
        }}>
            {activeTab === 'expenses' || activeTab === 'checks' ? (
                <>
                    <div className="card" style={{
                        height: '60px', // Uniform height
                        padding: '0 var(--spacing-md)', // Adjust padding for vertical centering
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 600 }}>GENEL TOPLAM</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{formatCurrency(generalTotal)}</div>
                        </div>
                    </div>

                    {activeTab === 'expenses' && project.partners?.map((partner) => (
                        <div key={partner.id} className="card" style={{
                            height: '60px',
                            padding: '0 var(--spacing-md)',
                            background: 'white',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}>
                            <div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase' }}>{partner.name} HARCAMA</div>
                            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '2px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(getPartnerTotal(partner.id))}</div>
                                <div style={{ fontSize: '10px', opacity: 0.7 }}>Hisse: %{partner.share_percentage}</div>
                            </div>
                        </div>
                    ))}

                </>
            ) : (
                <>
                    {/* Collection (Green) */}
                    <div className="card" style={{
                        height: '60px',
                        padding: '0 var(--spacing-md)',
                        background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 600 }}>TOPLAM TAHSİLAT</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatCurrency(aptStats.totalPaidAmount)}</div>
                        <div style={{ fontSize: '9px', opacity: 0.8 }}>Kasaya Giren</div>
                    </div>

                    {/* Remaining (Red) */}
                    <div className="card" style={{
                        height: '60px',
                        padding: '0 var(--spacing-md)',
                        background: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 600 }}>TOPLAM KALAN</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatCurrency(totalRemaining)}</div>
                        <div style={{ fontSize: '9px', opacity: 0.8 }}>Bekleyen Alacak</div>
                    </div>

                    {/* Sales (Blue) */}
                    <div className="card" style={{
                        height: '60px',
                        padding: '0 var(--spacing-md)',
                        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 600 }}>TOPLAM SATIŞ</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatCurrency(aptStats.totalSoldPrice)}</div>
                        <div style={{ fontSize: '9px', opacity: 0.8 }}>{aptStats.soldCount} Daire Satıldı</div>
                    </div>
                </>
            )}
        </div>

    );
};

export default SummaryCards;
