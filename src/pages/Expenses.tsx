import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { expenseService } from '../services/expenseService';
import { useAuth } from '../contexts/AuthContext';
import { Expense, ExpenseInput } from '../types';
import { formatNumberWithDots, parseNumberFromDots } from '../utils/formatters';

const Expenses = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const { user } = useAuth();
    const superAdminEmails = ['ctinferdi@gmail.com', 'ibrahim.erhan2@gmail.com'];
    const isSuperAdmin = user?.email && superAdminEmails.includes(user.email);

    const handleAdminAction = (action: () => void) => {
        if (!isSuperAdmin) {
            alert(`Bu işlem için yönetici onayı gereklidir.`);
            return;
        }
        action();
    };

    const [formData, setFormData] = useState<ExpenseInput>({
        category: '',
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0]
    });



    useEffect(() => {
        const unsubscribe = expenseService.subscribeToExpenses(setExpenses);
        setLoading(false);
        return unsubscribe;
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setErrorMsg(null);
            if (editingExpense) {
                await expenseService.updateExpense(editingExpense.id, formData);
            } else {
                await expenseService.addExpense(formData);
            }

            setShowModal(false);
            setEditingExpense(null);
            resetForm();
        } catch (error: any) {
            console.error('Error saving expense:', error);
            setErrorMsg(error.message || 'Harcama kaydedilemedi. Lütfen tekrar deneyin.');
        }
    };

    const resetForm = () => {
        setFormData({
            category: '',
            description: '',
            amount: 0,
            date: new Date().toISOString().split('T')[0]
        });
    };

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setFormData({
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            date: expense.date,
            project_id: expense.project_id,
            partner_id: expense.partner_id,
            payment_method: expense.payment_method,
            recipient: expense.recipient
        });
        setErrorMsg(null);
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        handleAdminAction(async () => {
            if (window.confirm('Bu harcamayı silmek istediğinizden emin misiniz?')) {
                try {
                    await expenseService.deleteExpense(id);
                } catch (error: any) {
                    console.error('Error deleting expense:', error);
                }
            }
        });
    };

    const filteredExpenses = expenses.filter(exp =>
        (exp.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exp.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

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
            <div className="animate-fadeIn">
                <div className="flex justify-between items-center mb-sm">
                    <h1 style={{ margin: 0 }}>💰 Harcama Kalemleri</h1>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingExpense(null);
                            resetForm();
                            setErrorMsg(null);
                            setShowModal(true);
                        }}
                    >
                        ➕ Yeni Harcama
                    </button>
                </div>

                {/* Search and Summary */}
                <div className="card mb-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="🔍 Harcama ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ maxWidth: '400px', flex: 1 }}
                        />
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)', marginBottom: '0.25rem' }}>
                                Toplam Harcama
                            </p>
                            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-danger)' }}>
                                {formatCurrency(totalExpenses)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                {filteredExpenses.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                        <p style={{ color: 'var(--color-text-light)' }}>
                            {searchTerm ? 'Arama kriterlerine uygun harcama bulunamadı.' : 'Henüz harcama kaydı yok. Yeni harcama ekleyerek başlayın.'}
                        </p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Kategori</th>
                                    <th>Açıklama</th>
                                    <th style={{ textAlign: 'right' }}>Tutar</th>
                                    <th style={{ textAlign: 'center' }}>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExpenses.map((expense) => (
                                    <tr key={expense.id}>
                                        <td>{new Date(expense.date).toLocaleDateString('tr-TR')}</td>
                                        <td><span className="badge badge-info">{expense.category}</span></td>
                                        <td>{expense.description}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-danger)' }}>
                                            {formatCurrency(expense.amount)}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleEdit(expense)}
                                                style={{ marginRight: 'var(--spacing-sm)' }}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(expense.id)}
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <div className="modal-overlay" style={{ backdropFilter: 'blur(3px)', backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setShowModal(false)}>
                        <div className="modal" style={{ maxWidth: '400px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header" style={{ background: 'var(--color-bg-alt)', padding: '12px 20px', borderBottom: '1px solid var(--color-border)' }}>
                                <h2 className="modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                                    {editingExpense ? 'Harcama Düzenle' : 'Yeni Harcama Kaydı'}
                                </h2>
                                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.5 }}>×</button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="modal-body" style={{ padding: '15px 20px' }}>
                                    <div className="form-group" style={{ marginBottom: '10px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>KATEGORİ</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            placeholder="Örn: Malzeme, İşçilik, Nakliye"
                                            style={{ padding: '8px 12px', fontSize: '13px' }}
                                            required
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '10px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>AÇIKLAMA</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Harcama detayı"
                                            style={{ padding: '8px 12px', fontSize: '13px' }}
                                            required
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '10px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>TUTAR (₺)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formatNumberWithDots(formData.amount)}
                                            onChange={(e) => setFormData({ ...formData, amount: parseNumberFromDots(e.target.value) })}
                                            style={{ padding: '8px 12px', fontSize: '13px' }}
                                            required
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '5px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>TARİH</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            style={{ padding: '8px 12px', fontSize: '13px' }}
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
                                            marginBottom: '15px'
                                        }}>
                                            ⚠️ {errorMsg}
                                        </div>
                                    )}
                                </div>

                                <div className="modal-footer" style={{ padding: '12px 20px', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', borderTop: '1px solid var(--color-border)' }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowModal(false)}
                                        style={{ padding: '8px 15px', fontSize: '13px' }}
                                    >
                                        İptal
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ padding: '8px 25px', fontWeight: 600, fontSize: '13px' }}>
                                        {editingExpense ? 'Güncelle' : 'Kaydet'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Expenses;
