import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { expenseService } from '../services/expenseService';
import { Expense, ExpenseInput } from '../types';

const Expenses = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

    const handleDelete = async (id: string) => {
        if (window.confirm('Bu harcamayı silmek istediğinizden emin misiniz?')) {
            try {
                await expenseService.deleteExpense(id);
            } catch (error: any) {
                console.error('Error deleting expense:', error);
            }
        }
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
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">
                                    {editingExpense ? 'Harcama Düzenle' : 'Yeni Harcama'}
                                </h2>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Kategori</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            placeholder="Örn: Malzeme, İşçilik, Nakliye"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Açıklama</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Harcama detayı"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Tutar (₺)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Tarih</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowModal(false)}
                                    >
                                        İptal
                                    </button>
                                    <button type="submit" className="btn btn-primary">
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
