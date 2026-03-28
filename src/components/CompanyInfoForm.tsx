import React from 'react';

interface CompanyInfoFormProps {
    companyInfo: {
        company_name: string;
        company_address: string;
        company_location: string;
        whatsapp_number: string;
    };
    setCompanyInfo: React.Dispatch<React.SetStateAction<{
        company_name: string;
        company_address: string;
        company_location: string;
        whatsapp_number: string;
    }>>;
    saveCompanyInfo: (e: React.FormEvent) => Promise<void>;
    savingCompany: boolean;
    companyMessage: string;
}

const CompanyInfoForm: React.FC<CompanyInfoFormProps> = ({
    companyInfo,
    setCompanyInfo,
    saveCompanyInfo,
    savingCompany,
    companyMessage
}) => {
    return (
        <div className="card" style={{ maxWidth: '480px', padding: '20px' }}>
            <h2 className="mb-xs" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏢 Firma Bilgileri
            </h2>
            <p className="mb-md" style={{ color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                QR kod ile gelen müşterilere gösterilecek bilgiler. Tüm projeleriniz için geçerlidir.
            </p>

            {companyMessage && (
                <div style={{
                    padding: '10px 12px',
                    background: companyMessage.includes('✅') ? '#d1fae5' : '#fee2e2',
                    color: companyMessage.includes('✅') ? '#065f46' : '#991b1b',
                    borderRadius: '6px',
                    marginBottom: '15px',
                    fontSize: '0.85rem',
                    fontWeight: 600
                }}>
                    {companyMessage}
                </div>
            )}

            <form onSubmit={saveCompanyInfo}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text)' }}>
                            FİRMA ADI
                        </label>
                        <input
                            type="text"
                            value={companyInfo.company_name}
                            onChange={(e) => setCompanyInfo({ ...companyInfo, company_name: e.target.value })}
                            placeholder="Örn: Ferdi İbrahim İnşaat"
                            className="form-input"
                            style={{ padding: '8px 12px', fontSize: '13px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text)' }}>
                            ADRES
                        </label>
                        <input
                            type="text"
                            value={companyInfo.company_address}
                            onChange={(e) => setCompanyInfo({ ...companyInfo, company_address: e.target.value })}
                            placeholder="Örn: Bahçelievler Mah. Çiçek Sk. No:123"
                            className="form-input"
                            style={{ padding: '8px 12px', fontSize: '13px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text)' }}>
                            KONUM (ŞEHİR)
                        </label>
                        <input
                            type="text"
                            value={companyInfo.company_location}
                            onChange={(e) => setCompanyInfo({ ...companyInfo, company_location: e.target.value })}
                            placeholder="Örn: İstanbul, Türkiye"
                            className="form-input"
                            style={{ padding: '8px 12px', fontSize: '13px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text)' }}>
                            WHATSAPP NUMARASI
                        </label>
                        <input
                            type="tel"
                            value={companyInfo.whatsapp_number}
                            onChange={(e) => setCompanyInfo({ ...companyInfo, whatsapp_number: e.target.value })}
                            placeholder="905551234567"
                            className="form-input"
                            style={{ padding: '8px 12px', fontSize: '13px' }}
                        />
                        <small style={{ fontSize: '10px', color: 'var(--color-text-light)', marginTop: '4px', display: 'block' }}>
                            Format: 905551234567 (başında +90 değil, sadece 90)
                        </small>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingCompany}
                        style={{ padding: '10px', fontSize: '14px', fontWeight: 700, marginTop: '8px' }}
                    >
                        {savingCompany ? '💾 Kaydediliyor...' : '💾 Firma Bilgilerini Kaydet'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CompanyInfoForm;
