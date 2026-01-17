import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { projectService } from '../services/projectService';
import { expenseService } from '../services/expenseService';
import { Project, Expense } from '../types';

const ProjectDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

    // Form states
    const [selectedPartner, setSelectedPartner] = useState('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [recipient, setRecipient] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    useEffect(() => {
        if (id) {
            projectService.getProject(id).then((data) => {
                setProject(data);
                // Sadece seçili ortak yoksa varsayılanı ayarla
                if (data?.partners && data.partners.length > 0 && !selectedPartner) {
                    setSelectedPartner(data.partners[0].id);
                }
                setLoading(false);
            }).catch(() => {
                alert('Proje bulunamadı!');
                navigate('/projeler');
            });

            // Giderleri yükle
            expenseService.getExpenses().then((allExpenses) => {
                const projectExpenses = allExpenses.filter(e => e.project_id === id);
                setExpenses(projectExpenses);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, navigate]);

    const [saving, setSaving] = useState(false);

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;

        setSaving(true);
        try {
            const expenseData = {
                date: expenseDate,
                category: category,
                description: description,
                amount: Number(amount.replace(/\./g, '')),
                project_id: id,
                partner_id: selectedPartner || undefined,
                payment_method: paymentMethod,
                recipient: recipient
            };

            if (editingExpenseId) {
                await expenseService.updateExpense(editingExpenseId, expenseData);
            } else {
                await expenseService.addExpense(expenseData);
            }

            // Reset form
            closeModal();

            // Reload expenses
            const allExpenses = await expenseService.getExpenses();
            const projectExpenses = allExpenses.filter(e => e.project_id === id);
            setExpenses(projectExpenses);

            // Kullanıcının isteği üzerine sayfayı yenile
            window.location.reload();
        } catch (error: any) {
            alert('Hata: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const closeModal = () => {
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('');
        setRecipient('');
        setCategory('');
        setDescription('');
        setAmount('');
        setEditingExpenseId(null);
        setShowExpenseModal(false);
    };

    const handleEditClick = (expense: Expense) => {
        setEditingExpenseId(expense.id);
        setExpenseDate(expense.date);
        setPaymentMethod(expense.payment_method || '');
        setRecipient(expense.recipient || '');
        setCategory(expense.category);
        setDescription(expense.description);
        setAmount(new Intl.NumberFormat('tr-TR').format(expense.amount));
        setSelectedPartner(expense.partner_id || '');
        setShowExpenseModal(true);
    };

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingExpense, setDeletingExpense] = useState<{ id: string, name: string } | null>(null);
    const [deleteConfirmCode, setDeleteConfirmCode] = useState('');
    const [generatedSecurityCode, setGeneratedSecurityCode] = useState('');

    const handleDeleteExpense = async () => {
        if (deleteConfirmCode === generatedSecurityCode) {
            try {
                if (deletingExpense) {
                    await expenseService.deleteExpense(deletingExpense.id);
                    const allExpenses = await expenseService.getExpenses();
                    const projectExpenses = allExpenses.filter(e => e.project_id === id);
                    setExpenses(projectExpenses);
                    window.location.reload();
                }
                setShowDeleteModal(false);
                setDeleteConfirmCode('');
                setGeneratedSecurityCode('');
                setDeletingExpense(null);
            } catch (error: any) {
                alert('Hata: ' + error.message);
            }
        } else {
            alert('Kod yanlış girildi. İşlem iptal edildi.');
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0
        }).format(value);
    };

    const getPartnerExpenses = (partnerId: string) => {
        return expenses.filter(e => e.partner_id === partnerId);
    };

    const getPartnerTotal = (partnerId: string) => {
        return getPartnerExpenses(partnerId).reduce((sum, e) => sum + e.amount, 0);
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

    if (!project) {
        return null;
    }

    const generalTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <Layout>
            <div>
                <div style={{
                    marginBottom: 'var(--spacing-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-md)',
                    background: 'white',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderRadius: 'var(--border-radius-lg)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                        <button
                            onClick={() => navigate('/projeler')}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: 'var(--font-size-sm)', marginBottom: 0 }}
                        >
                            ← Dön
                        </button>
                        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{project.name}</h1>
                        {project.description && (
                            <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-xs)', marginLeft: 'var(--spacing-xs)', borderLeft: '1px solid var(--color-border)', paddingLeft: 'var(--spacing-sm)' }}>
                                {project.description}
                            </span>
                        )}
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={() => setShowExpenseModal(true)}
                        style={{ padding: '0.5rem 1rem' }}
                    >
                        + Gider Ekle
                    </button>
                </div>

                {/* Summary Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-sm)'
                }}>
                    <div className="card" style={{
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.9, fontWeight: 600 }}>GENEL TOPLAM</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{formatCurrency(generalTotal)}</div>
                            <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.7 }}>&nbsp;</div>
                        </div>
                    </div>

                    {project.partners?.map((partner) => (
                        <div key={partner.id} className="card" style={{
                            padding: 'var(--spacing-sm) var(--spacing-md)',
                            background: 'white',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', fontWeight: 600 }}>{partner.name.toUpperCase()} TOPLAM HARCAMA</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(getPartnerTotal(partner.id))}</div>
                                <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.7 }}>%{partner.share_percentage}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Expenses Table */}
                <div className="card" style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                    <h1 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--spacing-sm)', color: 'var(--color-dark)' }}>Gider Listesi</h1>

                    {expenses.length === 0 ? (
                        <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                            Henüz gider eklenmemiş. "+ Gider Ekle" butonuna tıklayarak başlayın.
                        </p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--color-bg)', borderBottom: '2px solid var(--color-border)' }}>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>TARİH</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>KİM İÇİN</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>ÖDEME ŞEKLİ</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>VERİLEN KİŞİ</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>İŞ ADI</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>AÇIKLAMA</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>TUTAR</th>
                                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>İŞLEMLER</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map((expense) => {
                                        const partner = project.partners?.find(p => p.id === expense.partner_id);
                                        return (
                                            <tr key={expense.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                                                    {new Date(expense.date).toLocaleDateString('tr-TR')}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                    {partner ? partner.name : '-'}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                                                    {expense.payment_method || '-'}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                                                    {expense.recipient || '-'}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                    {expense.category}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                                                    {expense.description}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', fontWeight: 600, textAlign: 'right' }}>
                                                    {formatCurrency(expense.amount)}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => handleEditClick(expense)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                                            title="Düzenle"
                                                        >
                                                            📝
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const code = Math.floor(1000 + Math.random() * 9000).toString();
                                                                setGeneratedSecurityCode(code);
                                                                setDeletingExpense({ id: expense.id, name: expense.category });
                                                                setShowDeleteModal(true);
                                                            }}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                                            title="Sil"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Add Expense Modal */}
                {showExpenseModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1001,
                        padding: 'var(--spacing-md)'
                    }}>
                        <div className="card" style={{
                            width: 'min(100%, 450px)',
                            maxHeight: '95vh',
                            background: 'white',
                            boxShadow: 'var(--shadow-xl)',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 'var(--radius-lg)',
                            position: 'relative',
                            padding: 0
                        }} onClick={(e) => e.stopPropagation()}>
                            <div style={{
                                padding: 'var(--spacing-md) var(--spacing-lg)',
                                borderBottom: '1px solid var(--color-border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <h1 style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>
                                    {editingExpenseId ? 'Gideri Düzenle' : 'Yeni Gider Ekle'}
                                </h1>
                                <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-light)' }}>×</button>
                            </div>

                            <div style={{ padding: 'var(--spacing-lg)', overflowY: 'auto' }}>
                                <form onSubmit={handleAddExpense}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                        <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                            <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>TARİH</label>
                                            <input
                                                type="date"
                                                className="form-input"
                                                value={expenseDate}
                                                onChange={(e) => setExpenseDate(e.target.value)}
                                                style={{ padding: '0.6rem' }}
                                                required
                                            />
                                        </div>

                                        {project.partners && project.partners.length > 0 && (
                                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>KİM İÇİN</label>
                                                <select
                                                    className="form-input"
                                                    value={selectedPartner}
                                                    onChange={(e) => setSelectedPartner(e.target.value)}
                                                    style={{ padding: '0.6rem' }}
                                                    required
                                                >
                                                    {project.partners.map((partner) => (
                                                        <option key={partner.id} value={partner.id}>
                                                            {partner.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                        <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                            <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>ÖDEME ŞEKLİ</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={paymentMethod}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                                placeholder="EFT, Nakit, vb."
                                                style={{ padding: '0.6rem' }}
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                            <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>VERİLEN KİŞİ</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={recipient}
                                                onChange={(e) => setRecipient(e.target.value)}
                                                placeholder="Firma/Kişi"
                                                style={{ padding: '0.6rem' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                        <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>İŞ ADI</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            placeholder="Beton, Demir, İşçilik, vb."
                                            style={{ padding: '0.6rem' }}
                                            required
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                        <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>AÇIKLAMA</label>
                                        <textarea
                                            className="form-input"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Detaylı açıklama..."
                                            rows={2}
                                            style={{ resize: 'none', padding: '0.6rem' }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>TUTAR (TL)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={amount}
                                            onChange={(e) => {
                                                const rawValue = e.target.value.replace(/\D/g, '');
                                                if (rawValue === '') {
                                                    setAmount('');
                                                    return;
                                                }
                                                const formatted = new Intl.NumberFormat('tr-TR').format(Number(rawValue));
                                                setAmount(formatted);
                                            }}
                                            placeholder="0"
                                            style={{ padding: '0.8rem', fontSize: '1.25rem', fontWeight: 700 }}
                                            required
                                        />
                                    </div>
                                </form>
                            </div>

                            <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 'var(--spacing-md)' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={closeModal}
                                    style={{ flex: 1, padding: '0.5rem' }}
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={(e) => { e.preventDefault(); handleAddExpense(e as any); }}
                                    className="btn btn-primary"
                                    style={{ flex: 2, padding: '0.5rem' }}
                                    disabled={saving}
                                >
                                    {saving ? 'Kaydediliyor...' : (editingExpenseId ? 'Güncelle' : 'Kaydet')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Expense Modal */}
                {showDeleteModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: 'var(--spacing-md)'
                    }}>
                        <div className="card" style={{ maxWidth: '400px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                            <h2 className="mb-md">Gideri Sil</h2>
                            <p className="mb-lg" style={{ color: 'var(--color-text-light)' }}>
                                <strong>{deletingExpense?.name}</strong> giderini silmek için şu kodu girin: <strong style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>{generatedSecurityCode}</strong>
                            </p>

                            <div className="form-group">
                                <label className="form-label">GÜVENLİK KODU</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    value={deleteConfirmCode}
                                    onChange={(e) => setDeleteConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="4 haneli kodu girin"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoFocus
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                                <button
                                    onClick={handleDeleteExpense}
                                    className="btn btn-primary"
                                    style={{ flex: 1, backgroundColor: '#f5576c' }}
                                >
                                    Sil
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setDeleteConfirmCode('');
                                        setDeletingExpense(null);
                                    }}
                                    style={{ flex: 1 }}
                                >
                                    İptal
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ProjectDetail;
