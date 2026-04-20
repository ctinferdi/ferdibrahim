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
    checkStats: {
        paidTotal: number;
        pendingTotal: number;
    };
    formatCurrency: (value: number) => string;
    onExport?: () => void;
}


const SummaryCards: React.FC<SummaryCardsProps> = ({
    activeTab,
    generalTotal,
    project,
    getPartnerTotal,
    aptStats,
    checkStats,
    formatCurrency,
    onExport
}) => {
    const [showValues, setShowValues] = React.useState(false);
    const totalRemaining = aptStats.totalSoldPrice - aptStats.totalPaidAmount;

    return (
        <div className="summary-cards-row" style={{
            display: 'flex',
            gap: 'var(--spacing-sm)',
            alignItems: 'center'
        }}>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn" onClick={onExport} style={{ 
                    height: '40px', 
                    padding: '0 1.2rem', 
                    fontSize: '11px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    background: '#15803d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                }}>
                    📥 Excel İndir
                </button>
                
                <button 
                    onClick={() => setShowValues(!showValues)}
                    style={{
                        height: '40px',
                        padding: '0 1rem',
                        fontSize: '11px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: showValues ? '#f1f5f9' : '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#475569'
                    }}
                >
                    {showValues ? '🙈 Gizle' : '👁️ Özetleri Göster'}
                </button>
            </div>

            {showValues && (
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    {activeTab === 'expenses' ? (
                        <>
                            <div className="card" style={{
                                width: '200px',
                                height: '40px',
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

                            {project.partners?.map((partner) => (
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
                    ) : activeTab === 'checks' ? (
                        <>
                            <div className="card" style={{
                                width: '200px',
                                height: '40px',
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

                            <div className="card" style={{
                                width: '200px',
                                height: '40px',
                                padding: '0 var(--spacing-sm)',
                                background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
                                color: 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: '9px', opacity: 0.9, fontWeight: 600 }}>ÖDENEN ÇEKLER</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>{formatCurrency(checkStats.paidTotal)}</div>
                                    <div style={{ fontSize: '8px', opacity: 0.8 }}>ÖDENDİ</div>
                                </div>
                            </div>

                            <div className="card" style={{
                                width: '200px',
                                height: '40px',
                                padding: '0 var(--spacing-sm)',
                                background: 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)',
                                color: 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: '9px', opacity: 0.9, fontWeight: 600 }}>KALAN ÇEK ÖDEMELERİ</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>{formatCurrency(checkStats.pendingTotal)}</div>
                                    <div style={{ fontSize: '8px', opacity: 0.8 }}>BEKLEMEDE</div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
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
            )}
        </div>
    );
};

export default SummaryCards;
