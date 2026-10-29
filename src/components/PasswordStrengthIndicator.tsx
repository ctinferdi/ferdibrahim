import React from 'react';

interface PasswordStrengthIndicatorProps {
    password: string;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
    const checks = [
        { label: 'En az 8 karakter', passed: password.length >= 8 },
        { label: 'Büyük harf', passed: /[A-Z]/.test(password) },
        { label: 'Küçük harf', passed: /[a-z]/.test(password) },
        { label: 'Rakam', passed: /\d/.test(password) },
        { label: 'Sembol', passed: /[^A-Za-z0-9]/.test(password) },
    ];
    const score = checks.filter(check => check.passed).length;
    const strength = score <= 1
        ? { label: 'Zayıf', color: '#ef4444' }
        : score <= 3
            ? { label: 'Orta', color: '#f59e0b' }
            : score === 4
                ? { label: 'İyi', color: '#3b82f6' }
                : { label: 'Güçlü', color: '#10b981' };

    return (
        <div aria-live="polite" style={{ marginTop: '8px', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-text-light)' }}>Şifre gücü</span>
                <strong style={{ color: password ? strength.color : 'var(--color-text-light)' }}>
                    {password ? strength.label : 'Şifre girin'}
                </strong>
                <div aria-hidden="true" style={{ display: 'flex', gap: '3px', flex: 1 }}>
                    {checks.map((check, index) => (
                        <span
                            key={check.label}
                            style={{
                                height: '4px',
                                flex: 1,
                                borderRadius: '999px',
                                background: password && index < score ? strength.color : '#e2e8f0',
                            }}
                        />
                    ))}
                </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                {checks.map(check => (
                    <span key={check.label} style={{ color: check.passed ? '#059669' : 'var(--color-text-light)' }}>
                        {check.passed ? '✓' : '○'} {check.label}
                    </span>
                ))}
            </div>
            <small style={{ display: 'block', marginTop: '5px', color: 'var(--color-text-light)' }}>
                Güç göstergesi öneri amaçlıdır; mevcut en az 6 karakter sınırı değişmez.
            </small>
        </div>
    );
};

export default PasswordStrengthIndicator;
