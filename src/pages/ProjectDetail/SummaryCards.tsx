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
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 'var(--spacing-sm)',
            marginBottom: 'var(--spacing-xs)'
        }}>
            {activeTab === 'expenses' || activeTab === 'checks' ? (
                <>
                    <div className="card" style={{
                        padding: 'var(--spacing-xs) var(--spacing-md)',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.9, fontWeight: 600 }}>GENEL TOPLAM</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{formatCurrency(generalTotal)}</div>
                        </div>
                    </div>

                    {project.partners?.map((partner) => (
                        <div key={partner.id} className="card" style={{
                            padding: 'var(--spacing-xs) var(--spacing-md)',
                            background: 'white',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', fontWeight: 600 }}>{partner.name.toUpperCase()} HARCAMA</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(getPartnerTotal(partner.id))}</div>
                                <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.7 }}>%{partner.share_percentage}</div>
                            </div>
                        </div>
                    ))}
                </>
            ) : (
                <>
                    <div className="card" style={{
                        padding: 'var(--spacing-xs) var(--spacing-md)',
                        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.9, fontWeight: 600 }}>TOPLAM SATIŞ</div>
                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{formatCurrency(aptStats.totalSoldPrice)}</div>
                        <div style={{ fontSize: '9px', opacity: 0.8 }}>{aptStats.soldCount} Daire Satıldı</div>
                    </div>
                    <div className="card" style={{
                        padding: 'var(--spacing-xs) var(--spacing-md)',
                        background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.9, fontWeight: 600 }}>TOPLAM TAHSİLAT</div>
                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{formatCurrency(aptStats.totalPaidAmount)}</div>
                        <div style={{ fontSize: '9px', opacity: 0.8 }}>Kasaya Giren</div>
                    </div>
                    <div className="card" style={{
                        padding: 'var(--spacing-xs) var(--spacing-md)',
                        background: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.9, fontWeight: 600 }}>TOPLAM KALAN</div>
                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{formatCurrency(totalRemaining)}</div>
                        <div style={{ fontSize: '9px', opacity: 0.8 }}>Bekleyen Alacak</div>
                    </div>
                    <div className="card" style={{
                        padding: 'var(--spacing-xs) var(--spacing-md)',
                        background: 'white',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', fontWeight: 600 }}>DAİRE DURUMU</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 700 }}>{aptStats.total}</div>
                                <div style={{ fontSize: '8px', opacity: 0.6 }}>TOPLAM</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>{aptStats.soldCount}</div>
                                <div style={{ fontSize: '8px', opacity: 0.6 }}>SATILDI</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>{aptStats.ownerCount}</div>
                                <div style={{ fontSize: '8px', opacity: 0.6 }}>M.SAHİBİ</div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SummaryCards;
