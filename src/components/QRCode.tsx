import React from 'react';

interface QRCodeProps {
    value: string;
    size?: number;
}

const QRCode: React.FC<QRCodeProps> = ({ value, size = 160 }) => {
    // API kullanarak QR kod oluştur (npm paketi gerektirmiyor)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;

    return (
        <div className="qr-code-frame" style={{
            display: 'inline-block',
            padding: '16px',
            width: size + 32,
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
            <img
                src={qrUrl}
                alt="QR Code"
                width={size}
                height={size}
                style={{ display: 'block', width: '100%', height: 'auto' }}
            />
        </div>
    );
};

export default QRCode;
