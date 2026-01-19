// QR Kod Bölümü - ProjectDetail.tsx'e eklenecek
// Bu kodu ProjectDetail.tsx'in SummaryCards'tan sonra, Main Content Area'dan önce ekle

{
    activeTab === 'apartments' && project.public_code && (
        <div className="card" style={{ padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-lg)', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 800, marginBottom: 'var(--spacing-sm)' }}>
                        📱 Karekod ile Satış
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)', marginBottom: 'var(--spacing-sm)' }}>
                        Bu karekodu binaya asarak müşterilerin mobil cihazlarından satılık daireleri görüntülemesini sağlayabilirsiniz.
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <a
                            href={`${window.location.origin}/projeler/${project.public_code}/public`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ fontSize: '11px', padding: '0.4rem 1rem' }}
                        >
                            🔗 Public Sayfayı Aç
                        </a>
                        <button
                            onClick={() => {
                                const qrElement = document.getElementById('qr-code-svg');
                                if (qrElement) {
                                    const svgData = new XMLSerializer().serializeToString(qrElement);
                                    const canvas = document.createElement('canvas');
                                    const ctx = canvas.getContext('2d');
                                    const img = new Image();
                                    img.onload = () => {
                                        canvas.width = img.width;
                                        canvas.height = img.height;
                                        ctx?.drawImage(img, 0, 0);
                                        const pngFile = canvas.toDataURL('image/png');
                                        const downloadLink = document.createElement('a');
                                        downloadLink.download = `${project.name}-qr-code.png`;
                                        downloadLink.href = pngFile;
                                        downloadLink.click();
                                    };
                                    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                                }
                            }}
                            className="btn"
                            style={{ fontSize: '11px', padding: '0.4rem 1rem', background: '#10b981', color: 'white' }}
                        >
                            💾 QR Kodu İndir
                        </button>
                    </div>
                </div>
                <div id="qr-code-svg">
                    <QRCode value={`${window.location.origin}/projeler/${project.public_code}/public`} size={180} />
                </div>
            </div>
        </div>
    )
}

// QRCode import'u ekle:
// import QRCode from '../components/QRCode';
