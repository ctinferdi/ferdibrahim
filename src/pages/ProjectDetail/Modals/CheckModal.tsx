import React from 'react';
import { formatNumberWithDots, parseNumberFromDots } from '../../../utils/formatters';

interface CheckModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (e: React.FormEvent) => Promise<void>;
    editingCheckId: string | null;
    checkFormData: {
        company: string;
        check_number: string;
        amount: number;
        due_date: string;
        category: string;
        vat_status?: string;
        issuer: string;
    };
    setCheckFormData: (data: any) => void;
    saving: boolean;
    errorMsg: string | null;
}

const CheckModal: React.FC<CheckModalProps> = ({
    isOpen, onClose, onSave, editingCheckId,
    checkFormData, setCheckFormData,
    saving, errorMsg
}) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: 'var(--spacing-md)'
        }}>
            <div className="card" style={{
                width: 'min(100%, 500px)',
                maxHeight: '95vh',
                background: 'white',
                boxShadow: 'var(--shadow-xl)',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 'var(--radius-lg)',
                position: 'relative',
                padding: 0
            }} onClick={(e) => e.stopPropagation()}>
                <div style={{
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h1 style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>
                        {editingCheckId ? 'Çeki Düzenle' : 'Yeni Çek Ekle'}
                    </h1>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-light)' }}>×</button>
                </div>

                <div style={{ padding: 'var(--spacing-lg)', overflowY: 'auto' }}>
                    <form onSubmit={onSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)', gridColumn: 'span 2' }}>
                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>ŞİRKET BİLGİSİ</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={checkFormData.company}
                                    onChange={(e) => setCheckFormData({ ...checkFormData, company: e.target.value })}
                                    placeholder="Örn: ÖZYILMAZLAR"
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>ÇEK NO</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={checkFormData.check_number}
                                    onChange={(e) => setCheckFormData({ ...checkFormData, check_number: e.target.value })}
                                    placeholder="000123"
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>TUTAR (₺)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formatNumberWithDots(checkFormData.amount)}
                                    onChange={(e) => setCheckFormData({ ...checkFormData, amount: parseNumberFromDots(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>VADE TARİHİ</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={checkFormData.due_date}
                                    onChange={(e) => setCheckFormData({ ...checkFormData, due_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>KULLANILACAK YER</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={checkFormData.category}
                                    onChange={(e) => setCheckFormData({ ...checkFormData, category: e.target.value })}
                                    placeholder="Örn: BETON"
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>KDV DURUMU</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={checkFormData.vat_status || ''}
                                    onChange={(e) => setCheckFormData({ ...checkFormData, vat_status: e.target.value })}
                                    placeholder="Örn: KDV DAHİL"
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>ÇEKİ VERECEK KİŞİ</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={checkFormData.issuer || ''}
                                    onChange={(e) => setCheckFormData({ ...checkFormData, issuer: e.target.value })}
                                    placeholder="Örn: ERHANLAR"
                                />
                            </div>
                        </div>

                        {errorMsg && (
                            <div style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: 'var(--spacing-md)' }}>
                                ⚠️ {errorMsg}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                disabled={saving}
                            >
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onClose}
                                style={{ flex: 1 }}
                            >
                                İptal
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CheckModal;
