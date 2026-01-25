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
            display: 'flex',
            gap: 'var(--spacing-sm)',
            alignItems: 'center',
            width: 'auto', // Don't take full width
            flexWrap: 'nowrap' // Stay on same line
        }}>
            {activeTab === 'expenses' || activeTab === 'checks' ? (
                <>
                    <div className="card" style={{
                        width: '200px', // Reduced width
                        height: '40px', // Reduced height
                        padding: '0 var(--spacing-sm)',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <div style={{ fontSize: '9px', opacity: 0.9, fontWeight: 600 }}>GENEL TOPLAM</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{formatCurrency(generalTotal)}</div>
                        </div>
                    </div>

                    {activeTab === 'expenses' && project.partners?.map((partner) => (
                        <div key={partner.id} className="card" style={{
                            width: '200px',
                            height: '40px',
                            padding: '0 var(--spacing-sm)',
                            background: 'white',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}>
                            <div style={{ fontSize: '9px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{partner.name}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(getPartnerTotal(partner.id))}</div>
                                <div style={{ fontSize: '8px', opacity: 0.7 }}>%{partner.share_percentage}</div>
                            </div>
                        </div>
                    ))}

                </>
            ) : (
                <>
                    {/* Remaining (Red) */}
                    <div className="card" style={{
                        width: '200px',
                        height: '40px',
                        padding: '0 var(--spacing-sm)',
                        background: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <div style={{ fontSize: '9px', opacity: 0.9, fontWeight: 600 }}>TOPLAM KALAN</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{formatCurrency(totalRemaining)}</div>
                            <div style={{ fontSize: '8px', opacity: 0.8 }}>Alacak</div>
                        </div>
                    </div>

                    {/* Sales (Blue) */}
                    <div className="card" style={{
                        width: '200px',
                        height: '40px',
                        padding: '0 var(--spacing-sm)',
                        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <div style={{ fontSize: '9px', opacity: 0.9, fontWeight: 600 }}>TOPLAM SATIŞ</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{formatCurrency(aptStats.totalSoldPrice)}</div>
                            <div style={{ fontSize: '8px', opacity: 0.8 }}>{aptStats.soldCount} Satış</div>
                        </div>
                    </div>
                </>
            )}
        </div>

    );
};

export default SummaryCards;
