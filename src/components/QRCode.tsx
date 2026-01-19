import React from 'react';
// @ts-ignore - qrcode.react type tanımları eksik olabilir
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
    value: string;
    size?: number;
    level?: 'L' | 'M' | 'Q' | 'H';
    includeMargin?: boolean;
}

const QRCode: React.FC<QRCodeProps> = ({
    value,
    size = 256,
    level = 'H',
    includeMargin = true
}) => {
    return (
        <div style={{ display: 'inline-block', padding: '16px', background: 'white', borderRadius: '8px' }}>
            <QRCodeSVG
                value={value}
                size={size}
                level={level}
                includeMargin={includeMargin}
            />
        </div>
    );
};

export default QRCode;
