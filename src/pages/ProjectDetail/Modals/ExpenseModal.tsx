import { Project } from '../../../types';
import { formatNumberWithDots } from '../../../utils/formatters';

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (e: React.FormEvent) => Promise<void>;
    project: Project;
    editingExpenseId: string | null;
    expenseDate: string;
    setExpenseDate: (val: string) => void;
    selectedPartner: string;
    setSelectedPartner: (val: string) => void;
    paymentMethod: string;
    setPaymentMethod: (val: string) => void;
    recipient: string;
    setRecipient: (val: string) => void;
    category: string;
    setCategory: (val: string) => void;
    description: string;
    setDescription: (val: string) => void;
    amount: string;
    setAmount: (val: string) => void;
    saving: boolean;
    errorMsg: string | null;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({
    isOpen, onClose, onSave, project, editingExpenseId,
    expenseDate, setExpenseDate,
    selectedPartner, setSelectedPartner,
    paymentMethod, setPaymentMethod,
    recipient, setRecipient,
    category, setCategory,
    description, setDescription,
    amount, setAmount,
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
                width: 'min(100%, 450px)',
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
                        {editingExpenseId ? 'Gideri Düzenle' : 'Yeni Gider Ekle'}
                    </h1>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-light)' }}>×</button>
                </div>

                <div style={{ padding: 'var(--spacing-lg)', overflowY: 'auto' }}>
                    <form onSubmit={onSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>TARİH</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={expenseDate}
                                    onChange={(e) => setExpenseDate(e.target.value)}
                                    style={{ padding: '0.6rem' }}
                                    required
                                />
                            </div>

                            {project.partners && project.partners.length > 0 && (
                                <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>KİM İÇİN</label>
                                    <select
                                        className="form-input"
                                        value={selectedPartner}
                                        onChange={(e) => setSelectedPartner(e.target.value)}
                                        style={{ padding: '0.6rem' }}
                                        required
                                    >
                                        {project.partners.map((partner) => (
                                            <option key={partner.id} value={partner.id}>
                                                {partner.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>ÖDEME ŞEKLİ</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    placeholder="EFT, Nakit, vb."
                                    style={{ padding: '0.6rem' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>VERİLEN KİŞİ</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value)}
                                    placeholder="Firma/Kişi"
                                    style={{ padding: '0.6rem' }}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>İŞ ADI</label>
                            <input
                                type="text"
                                className="form-input"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="Beton, Demir, İşçilik, vb."
                                style={{ padding: '0.6rem' }}
                                required
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>AÇIKLAMA</label>
                            <textarea
                                className="form-input"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detaylı açıklama..."
                                rows={2}
                                style={{ resize: 'none', padding: '0.6rem' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>TUTAR (TL)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formatNumberWithDots(amount)}
                                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                                placeholder="0"
                                style={{ padding: '0.8rem', fontSize: '1.25rem', fontWeight: 700 }}
                                required
                            />
                        </div>

                        {errorMsg && (
                            <div style={{
                                padding: '10px',
                                background: '#fee2e2',
                                color: '#991b1b',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                border: '1px solid #fecaca',
                                marginTop: 'var(--spacing-md)'
                            }}>
                                ⚠️ {errorMsg}
                            </div>
                        )}
                    </form>
                </div>

                <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 'var(--spacing-md)' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        style={{ flex: 1, padding: '0.5rem' }}
                    >
                        İptal
                    </button>
                    <button
                        onClick={onSave}
                        className="btn btn-primary"
                        style={{ flex: 2, padding: '0.5rem' }}
                        disabled={saving}
                    >
                        {saving ? 'Kaydediliyor...' : (editingExpenseId ? 'Güncelle' : 'Kaydet')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpenseModal;
