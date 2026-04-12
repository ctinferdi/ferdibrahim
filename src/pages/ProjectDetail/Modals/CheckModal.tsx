import React from 'react';
import { formatNumberWithDots, parseNumberFromDots } from '../../../utils/formatters';
import { Project } from '../../../types';

const formatPhoneDisplay = (raw: string): string => {
    const d = raw.replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('905') && d.length <= 12) {
        const n = d.slice(2);
        let out = '+90(';
        out += n.slice(0, 3);
        if (n.length >= 3) out += ') ';
        out += n.slice(3, 6);
        if (n.length >= 6) out += ' ';
        out += n.slice(6, 10);
        return out;
    }
    if (d.startsWith('0') && d.length <= 11) {
        const n = d.slice(1);
        let out = '0(';
        out += n.slice(0, 3);
        if (n.length >= 3) out += ') ';
        out += n.slice(3, 6);
        if (n.length >= 6) out += ' ';
        out += n.slice(6, 10);
        return out;
    }
    return d;
};

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
        status: string;
        given_date: string;
        description?: string;
        notification_phone?: string;
        notification_phone_2?: string;
        notification_phone_3?: string;
        notification_email?: string;
        notification_email_2?: string;
        notification_email_3?: string;
        project_id?: string;
    };
    setCheckFormData: (data: any) => void;
    saving: boolean;
    errorMsg: string | null;
    projects?: Project[]; // Optional, for global Checks page
}

const CheckModal: React.FC<CheckModalProps> = ({
    isOpen, onClose, onSave, editingCheckId,
    checkFormData, setCheckFormData,
    saving, errorMsg, projects = []
}) => {
    const [showPhones, setShowPhones] = React.useState(false);
    const [showEmails, setShowEmails] = React.useState(false);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 1001 }}>
            <div className="modal" style={{ maxWidth: '480px', borderRadius: '12px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{ background: '#fff', padding: '15px 20px', borderBottom: '1px solid var(--color-border)' }}>
                    <h2 className="modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                        {editingCheckId ? 'Çeki Düzenle' : 'Yeni Çek Kaydı'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-light)', lineHeight: 1 }}>×</button>
                </div>

                <form onSubmit={onSave}>
                    <div className="modal-body" style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                        {/* Company (3/4) & Check No (1/4) */}
                        <div className="form-group" style={{ gridColumn: 'span 1', marginBottom: '2px' }}>
                            <label className="form-label" style={{ fontSize: '10px', marginBottom: '2px', fontWeight: 700 }}>ŞİRKET</label>
                            <input
                                type="text"
                                className="form-input"
                                value={checkFormData.company}
                                onChange={(e) => setCheckFormData({ ...checkFormData, company: e.target.value })}
                                placeholder="Şirket adı"
                                style={{ padding: '6px 10px', fontSize: '13px' }}
                                required
                            />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 1', marginBottom: '2px' }}>
                            <label className="form-label" style={{ fontSize: '10px', marginBottom: '2px', fontWeight: 700 }}>ÇEK NO</label>
                            <input
                                type="text"
                                className="form-input"
                                value={checkFormData.check_number}
                                onChange={(e) => setCheckFormData({ ...checkFormData, check_number: e.target.value })}
                                placeholder="000XXX"
                                style={{ padding: '6px 10px', fontSize: '13px' }}
                            />
                        </div>

                        {/* Amount & Vade Tarihi */}
                        <div className="form-group" style={{ marginBottom: '2px' }}>
                            <label className="form-label" style={{ fontSize: '10px', marginBottom: '2px', fontWeight: 700 }}>TUTAR (₺)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formatNumberWithDots(checkFormData.amount)}
                                onChange={(e) => setCheckFormData({ ...checkFormData, amount: parseNumberFromDots(e.target.value) })}
                                style={{ padding: '6px 10px', fontSize: '13px' }}
                                required
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '2px' }}>
                            <label className="form-label" style={{ fontSize: '10px', marginBottom: '2px', fontWeight: 700 }}>VADE TARİHİ</label>
                            <input
                                type="date"
                                className="form-input"
                                value={checkFormData.due_date}
                                onChange={(e) => setCheckFormData({ ...checkFormData, due_date: e.target.value })}
                                style={{ padding: '6px 10px', fontSize: '13px' }}
                                required
                            />
                        </div>

                        {/* Kullanılacak Yer & Çeki Veren Kişi */}
                        <div className="form-group" style={{ marginBottom: '2px' }}>
                            <label className="form-label" style={{ fontSize: '10px', marginBottom: '2px', fontWeight: 700 }}>KULLANILACAK YER</label>
                            <input
                                type="text"
                                className="form-input"
                                value={checkFormData.category}
                                onChange={(e) => setCheckFormData({ ...checkFormData, category: e.target.value })}
                                placeholder="Örn: BETON"
                                style={{ padding: '6px 10px', fontSize: '13px' }}
                                required
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '2px' }}>
                            <label className="form-label" style={{ fontSize: '10px', marginBottom: '2px', fontWeight: 700 }}>ÇEKİ VEREN KİŞİ</label>
                            <input
                                type="text"
                                className="form-input"
                                value={checkFormData.issuer}
                                onChange={(e) => setCheckFormData({ ...checkFormData, issuer: e.target.value })}
                                placeholder="İsim soyisim"
                                style={{ padding: '6px 10px', fontSize: '13px' }}
                            />
                        </div>

                        {/* KDV Durumu & Durum */}
                        <div className="form-group" style={{ marginBottom: '2px' }}>
                            <label className="form-label" style={{ fontSize: '10px', marginBottom: '2px', fontWeight: 700 }}>KDV DURUMU</label>
                            <select
                                className="form-select"
                                value={checkFormData.vat_status || 'KDV DAHİL'}
                                onChange={(e) => setCheckFormData({ ...checkFormData, vat_status: e.target.value })}
                                style={{ padding: '6px 10px', fontSize: '13px', margin: 0, height: '33px' }}
                            >
                                <option value="KDV DAHİL">KDV DAHİL</option>
                                <option value="+KDV OLACAK">+KDV OLACAK</option>
                                <option value="KDV YOK">KDV YOK</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: '2px' }}>
                            <label className="form-label" style={{ fontSize: '10px', marginBottom: '2px', fontWeight: 700 }}>DURUM</label>
                            <select
                                className="form-select"
                                value={checkFormData.status}
                                onChange={(e) => setCheckFormData({ ...checkFormData, status: e.target.value })}
                                style={{ padding: '6px 10px', fontSize: '13px', margin: 0, height: '33px' }}
                            >
                                <option value="pending">Beklemede</option>
                                <option value="paid">Ödendi</option>
                            </select>
                        </div>

                        {/* Veriliş Tarihi & Proje */}
                        <div className="form-group" style={{ marginBottom: '2px' }}>
                            <label className="form-label" style={{ fontSize: '10px', marginBottom: '2px', fontWeight: 700 }}>VERİLİŞ TARİHİ</label>
                            <input
                                type="date"
                                className="form-input"
                                value={checkFormData.given_date}
                                onChange={(e) => setCheckFormData({ ...checkFormData, given_date: e.target.value })}
                                style={{ padding: '6px 10px', fontSize: '13px' }}
                                required
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '2px' }}>
                            <label className="form-label" style={{ fontSize: '10px', marginBottom: '2px', fontWeight: 700 }}>PROJE (OPSİYONEL)</label>
                            <select
                                className="form-select"
                                value={checkFormData.project_id || ''}
                                onChange={(e) => setCheckFormData({ ...checkFormData, project_id: e.target.value })}
                                style={{ padding: '6px 10px', fontSize: '13px', margin: 0, height: '33px' }}
                            >
                                <option value="">Seçilmedi</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>



                        {/* Email Bildirimleri - Collapsible */}
                        <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: '2px', marginTop: '4px' }}>
                            <div
                                onClick={() => setShowEmails(!showEmails)}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    padding: '4px 0',
                                    borderBottom: '1px solid #e0e7ff'
                                }}
                            >
                                <label className="form-label" style={{ fontSize: '10px', cursor: 'pointer', marginBottom: 0, color: '#4338ca', fontWeight: 800 }}>
                                    📧 E-POSTA BİLDİRİM ADRESLERİ
                                </label>
                                <span style={{ fontSize: '10px', color: '#4338ca' }}>{showEmails ? '▲' : '▼'}</span>
                            </div>

                            {showEmails && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={checkFormData.notification_email || ''}
                                        onChange={(e) => setCheckFormData({ ...checkFormData, notification_email: e.target.value })}
                                        placeholder="E-posta adresi (1)"
                                        style={{ padding: '6px 10px', fontSize: '13px', borderColor: '#c7d2fe' }}
                                    />
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={checkFormData.notification_email_2 || ''}
                                        onChange={(e) => setCheckFormData({ ...checkFormData, notification_email_2: e.target.value })}
                                        placeholder="E-posta adresi (2)"
                                        style={{ padding: '6px 10px', fontSize: '13px', borderColor: '#c7d2fe' }}
                                    />
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={checkFormData.notification_email_3 || ''}
                                        onChange={(e) => setCheckFormData({ ...checkFormData, notification_email_3: e.target.value })}
                                        placeholder="E-posta adresi (3)"
                                        style={{ padding: '6px 10px', fontSize: '13px', borderColor: '#c7d2fe' }}
                                    />
                                    <p style={{ fontSize: '10px', color: '#6b7280', margin: '2px 0 0 0' }}>
                                        Vade 10 gün kala girilen e-postaların tümüne bilgilendirme gönderilir.
                                    </p>
                                </div>
                            )}
                        </div>

                    </div>

                    {errorMsg && (
                        <div style={{ padding: '0 20px 10px 20px', color: 'var(--color-danger)', fontSize: '0.8rem' }}>
                            ⚠️ {errorMsg}
                        </div>
                    )}

                    <div className="modal-footer" style={{ padding: '15px 20px', borderTop: '1px solid var(--color-border)', background: '#f8fafc', display: 'flex', gap: '10px' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1, padding: '10px' }}>İptal</button>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, padding: '10px', fontWeight: 700 }}>
                            {saving ? 'Kaydediliyor...' : (editingCheckId ? 'Güncelle' : 'Kaydet')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CheckModal;
