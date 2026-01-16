import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { subscribeToExpenses, addExpense, updateExpense, deleteExpense } from '../services/expenseService';
import { Expense, ExpenseInput } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Expenses = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState<ExpenseInput>({
        kategori: '',
        aciklama: '',
        tutar: 0,
        tarih: new Date()
    });

    const { currentUser } = useAuth();

    useEffect(() => {
        const unsubscribe = subscribeToExpenses(setExpenses);
        setLoading(false);
        return unsubscribe;
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingExpense) {
                await updateExpense(editingExpense.id, formData);
            } else {
                await addExpense(formData, currentUser!.uid);
            }

            setShowModal(false);
            setEditingExpense(null);
            setFormData({ kategori: '', aciklama: '', tutar: 0, tarih: new Date() });
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('Harcama kaydedilemedi. Lütfen tekrar deneyin.');
        }
    };

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setFormData({
            kategori: expense.kategori,
            aciklama: expense.aciklama,
            tutar: expense.tutar,
            tarih: expense.tarih
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Bu harcamayı silmek istediğinizden emin misiniz?')) {
            try {
                await deleteExpense(id);
            } catch (error) {
                console.error('Error deleting expense:', error);
                alert('Harcama silinemedi. Lütfen tekrar deneyin.');
            }
        }
    };

    const filteredExpenses = expenses.filter(exp =>
        exp.kategori.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.aciklama.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.tutar, 0);

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
                <div className="flex justify-between items-center mb-xl">
                    <h1>💰 Harcama Kalemleri</h1>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingExpense(null);
                            setFormData({ kategori: '', aciklama: '', tutar: 0, tarih: new Date() });
                            setShowModal(true);
                        }}
                    >
                        ➕ Yeni Harcama
                    </button>
                </div>

                {/* Search and Summary */}
                <div className="card mb-lg">
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
                                        <td>{expense.tarih.toLocaleDateString('tr-TR')}</td>
                                        <td><span className="badge badge-info">{expense.kategori}</span></td>
                                        <td>{expense.aciklama}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-danger)' }}>
                                            {formatCurrency(expense.tutar)}
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
                                            value={formData.kategori}
                                            onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                                            placeholder="Örn: Malzeme, İşçilik, Nakliye"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Açıklama</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.aciklama}
                                            onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                                            placeholder="Harcama detayı"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Tutar (₺)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.tutar}
                                            onChange={(e) => setFormData({ ...formData, tutar: Number(e.target.value) })}
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
                                            value={formData.tarih instanceof Date ? formData.tarih.toISOString().split('T')[0] : ''}
                                            onChange={(e) => setFormData({ ...formData, tarih: new Date(e.target.value) })}
                                            required
                                        />
                                    </div>
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
