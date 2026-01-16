import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { expenseService } from '../services/expenseService';
import { checkService } from '../services/checkService';
import { apartmentService } from '../services/apartmentService';
import { Expense, Check, Apartment } from '../types';

const Dashboard = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [checks, setChecks] = useState<Check[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubExpenses = expenseService.subscribeToExpenses(setExpenses);
        const unsubChecks = checkService.subscribeToChecks(setChecks);
        const unsubApartments = apartmentService.subscribeToApartments(setApartments);

        setLoading(false);

        return () => {
            unsubExpenses();
            unsubChecks();
            unsubApartments();
        };
    }, []);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const pendingChecks = checks.filter(c => c.status === 'pending');
    const totalCheckAmount = pendingChecks.reduce((sum, c) => sum + c.amount, 0);
    const availableApartments = apartments.filter(a => a.status === 'available');
    const soldApartments = apartments.filter(a => a.status === 'sold');
    const totalSalesValue = soldApartments.reduce((sum, a) => sum + a.price, 0);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return (
            <Layout>
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div>
                <h1 className="mb-lg">Dashboard</h1>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 'var(--spacing-lg)',
                    marginBottom: 'var(--spacing-2xl)'
                }}>
                    <div className="card" style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white'
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💰</div>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem' }}>
                            TOPLAM HARCAMA
                        </h3>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>
                            {formatCurrency(totalExpenses)}
                        </div>
                        <p style={{ marginTop: '0.5rem', opacity: 0.8, fontSize: 'var(--font-size-sm)' }}>
                            {expenses.length} kayıt
                        </p>
                    </div>

                    <div className="card" style={{
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white'
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💳</div>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem' }}>
                            BEKLEYEN ÇEKLER
                        </h3>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>
                            {formatCurrency(totalCheckAmount)}
                        </div>
                        <p style={{ marginTop: '0.5rem', opacity: 0.8, fontSize: 'var(--font-size-sm)' }}>
                            {pendingChecks.length} bekleyen çek
                        </p>
                    </div>

                    <div className="card" style={{
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        color: 'white'
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏢</div>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem' }}>
                            MÜSAİT DAİRELER
                        </h3>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>
                            {availableApartments.length}
                        </div>
                        <p style={{ marginTop: '0.5rem', opacity: 0.8, fontSize: 'var(--font-size-sm)' }}>
                            Toplam {apartments.length} daire
                        </p>
                    </div>

                    <div className="card" style={{
                        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                        color: 'white'
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem' }}>
                            TOPLAM SATIŞ
                        </h3>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>
                            {formatCurrency(totalSalesValue)}
                        </div>
                        <p style={{ marginTop: '0.5rem', opacity: 0.8, fontSize: 'var(--font-size-sm)' }}>
                            {soldApartments.length} satılan daire
                        </p>
                    </div>
                </div>

                <div className="card">
                    <h2 className="mb-lg">Son Hareketler</h2>

                    {expenses.length === 0 && checks.length === 0 && apartments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--color-text-light)' }}>
                            <p>Henüz kayıt bulunmuyor. Harcama, çek veya daire ekleyerek başlayın.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {expenses.slice(0, 5).map((exp) => (
                                <div key={exp.id} style={{
                                    padding: 'var(--spacing-md)',
                                    background: 'var(--color-bg)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                            💰 {exp.category} - {exp.description}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                                            {new Date(exp.date).toLocaleDateString('tr-TR')}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 700, color: 'var(--color-danger)' }}>
                                        -{formatCurrency(exp.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;
