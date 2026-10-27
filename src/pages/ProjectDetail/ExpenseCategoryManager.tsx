import React, { useMemo, useState } from 'react';
import { Expense } from '../../types';
import { ExpenseCategoryStorage, normalizeExpenseCategory } from '../../services/expenseCategoryService';
import { groupExpenseTransactions } from '../../utils/expenseGrouping';

interface ExpenseCategoryManagerProps {
    categories: string[];
    expenses: Expense[];
    storageMode: ExpenseCategoryStorage;
    selectedCategory: string | null;
    onSelectCategory: (category: string) => void;
    onAdd: (category: string) => Promise<ExpenseCategoryStorage>;
    onRemove: (category: string) => Promise<void>;
    onRename: (oldCategory: string, newCategory: string) => Promise<ExpenseCategoryStorage>;
    formatCurrency: (amount: number) => string;
}

const ExpenseCategoryManager: React.FC<ExpenseCategoryManagerProps> = ({
    categories,
    expenses,
    storageMode,
    selectedCategory,
    onSelectCategory,
    onAdd,
    onRemove,
    onRename,
    formatCurrency
}) => {
    const [newCategory, setNewCategory] = useState('');
    const [busyCategory, setBusyCategory] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editedCategoryName, setEditedCategoryName] = useState('');
    const [notice, setNotice] = useState<{ tone: 'success' | 'warning' | 'error'; text: string } | null>(null);

    const categoryStats = useMemo(() => {
        const normalizedStats = new Map<string, { count: number; total: number }>();
        groupExpenseTransactions(expenses).forEach(transaction => {
            const key = normalizeExpenseCategory(transaction.expenses[0]?.category || '');
            const current = normalizedStats.get(key) || { count: 0, total: 0 };
            normalizedStats.set(key, { count: current.count + 1, total: current.total + transaction.total });
        });
        return normalizedStats;
    }, [expenses]);

    const getNotice = (result: ExpenseCategoryStorage, action: string) => {
        if (result === 'shared') {
            setNotice({ tone: 'success', text: `Kalem proje verisine ${action}.` });
        } else if (result === 'local') {
            setNotice({
                tone: 'warning',
                text: `Kalem bu tarayıcıda ${action}. Ortak kullanım için supabase/schema_update.sql dosyasını veritabanına uygulayın.`
            });
        } else {
            setNotice({ tone: 'error', text: 'Kalem kaydedilemedi. Tarayıcı depolama alanı veya proje bağlantısını kontrol edin.' });
        }
    };

    const handleAdd = async (event: React.FormEvent) => {
        event.preventDefault();
        const normalized = normalizeExpenseCategory(newCategory);
        if (!normalized) return;

        if (categories.some(category => normalizeExpenseCategory(category) === normalized)) {
            setNotice({ tone: 'error', text: 'Bu gider kalemi zaten listede var.' });
            return;
        }

        setBusyCategory('__add__');
        setNotice(null);
        try {
            const result = await onAdd(normalized);
            getNotice(result, 'kaydedildi');
            setNewCategory('');
        } catch {
            setNotice({ tone: 'error', text: 'Gider kalemi eklenemedi. Tekrar deneyin.' });
        } finally {
            setBusyCategory(null);
        }
    };

    const handleRequestRemove = async (category: string) => {
        setBusyCategory(category);
        setNotice(null);
        try {
            await onRemove(category);
            setNotice({ tone: 'success', text: 'Güvenlik kodu e-posta adresinize gönderildi. Kod onaylanınca kalem kaldırılacak.' });
        } catch {
            setNotice({ tone: 'error', text: 'Silme onay kodu gönderilemedi. Tekrar deneyin.' });
        } finally {
            setBusyCategory(null);
        }
    };

    const handleRename = async (event: React.FormEvent, category: string) => {
        event.preventDefault();
        const normalized = normalizeExpenseCategory(editedCategoryName);
        if (!normalized) return;

        if (categories.some(item => normalizeExpenseCategory(item) === normalized && normalizeExpenseCategory(item) !== normalizeExpenseCategory(category))) {
            setNotice({ tone: 'error', text: 'Bu isimde başka bir gider kalemi zaten var.' });
            return;
        }

        setBusyCategory(category);
        setNotice(null);
        try {
            const result = await onRename(category, normalized);
            getNotice(result, 'güncellendi');
            setEditingCategory(null);
            setEditedCategoryName('');
        } catch (error) {
            setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Gider kalemi güncellenemedi. Tekrar deneyin.' });
        } finally {
            setBusyCategory(null);
        }
    };

    const noticeColors = notice?.tone === 'success'
        ? { background: '#ecfdf5', border: '#a7f3d0', color: '#047857' }
        : notice?.tone === 'error'
            ? { background: '#fef2f2', border: '#fecaca', color: '#b91c1c' }
            : { background: '#fffbeb', border: '#fde68a', color: '#92400e' };

    return (
        <section className="expense-category-manager" aria-labelledby="expense-category-title">
            <div style={{ marginBottom: 18 }}>
                <h2 id="expense-category-title" style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 800 }}>
                    Gider Kalemleri
                </h2>
            </div>

            {storageMode !== 'shared' && (
                <div role="status" style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e', fontSize: 12, lineHeight: 1.5 }}>
                    Bu liste şimdilik bu tarayıcıda saklanıyor. Diğer kullanıcılarla paylaşılması için <strong>supabase/schema_update.sql</strong> dosyasının veritabanına uygulanması gerekiyor.
                </div>
            )}

            {notice && (
                <div role="status" style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 10, border: `1px solid ${noticeColors.border}`, background: noticeColors.background, color: noticeColors.color, fontSize: 12, lineHeight: 1.5 }}>
                    {notice.text}
                </div>
            )}

            <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <input
                    type="text"
                    className="form-input"
                    value={newCategory}
                    onChange={event => setNewCategory(event.target.value)}
                    placeholder="Yeni gider kalemi adı"
                    maxLength={80}
                    aria-label="Yeni gider kalemi adı"
                    style={{ flex: '1 1 220px', minWidth: 0 }}
                    disabled={busyCategory !== null}
                />
                <button className="btn btn-primary" type="submit" disabled={!newCategory.trim() || busyCategory !== null} style={{ whiteSpace: 'nowrap' }}>
                    {busyCategory === '__add__' ? 'Kaydediliyor…' : '+ Kalem Ekle'}
                </button>
            </form>

            {categories.length === 0 ? (
                <div style={{ padding: '30px 18px', border: '1px dashed #cbd5e1', borderRadius: 12, textAlign: 'center', color: '#64748b', background: '#f8fafc' }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>🧾</div>
                    <strong style={{ color: '#334155' }}>Henüz gider kalemi eklenmedi</strong>
                    <div style={{ fontSize: 12, marginTop: 5 }}>İlk kalemini yukarıdan ekleyebilirsin.</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 10 }}>
                    {categories.map(category => {
                        const stats = categoryStats.get(normalizeExpenseCategory(category)) || { count: 0, total: 0 };
                        const isSelected = normalizeExpenseCategory(selectedCategory || '') === normalizeExpenseCategory(category);
                        const isEditing = editingCategory === category;
                        return (
                            <div key={category} style={{ minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 9px', border: `1px solid ${isSelected ? '#93c5fd' : '#dbe3ef'}`, borderRadius: 11, background: isSelected ? '#eff6ff' : '#fff', boxShadow: isSelected ? '0 0 0 2px rgba(59,130,246,0.08)' : '0 2px 6px rgba(15,23,42,0.04)' }}>
                                {isEditing ? (
                                    <form onSubmit={event => void handleRename(event, category)} style={{ display: 'flex', flex: '1 1 auto', minWidth: 0, flexWrap: 'wrap', gap: 6 }}>
                                        <input
                                            className="form-input"
                                            aria-label={`${category} yeni adı`}
                                            value={editedCategoryName}
                                            onChange={event => setEditedCategoryName(event.target.value)}
                                            maxLength={80}
                                            autoFocus
                                            style={{ flex: '1 1 100%', minWidth: 0, height: 36, padding: '6px 8px', fontSize: 12 }}
                                        />
                                        <button type="submit" className="btn btn-primary" disabled={!editedCategoryName.trim() || busyCategory !== null} style={{ flex: '1 1 auto', minHeight: 32, padding: '5px 8px', fontSize: 10 }}>
                                            Kaydet
                                        </button>
                                        <button type="button" className="btn btn-secondary" disabled={busyCategory !== null} onClick={() => { setEditingCategory(null); setEditedCategoryName(''); }} style={{ flex: '1 1 auto', minHeight: 32, padding: '5px 8px', fontSize: 10 }}>
                                            Vazgeç
                                        </button>
                                    </form>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            aria-pressed={isSelected}
                                            onClick={() => onSelectCategory(category)}
                                            style={{ flex: '1 1 auto', minWidth: 0, padding: '4px', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                                        >
                                            <strong style={{ display: 'block', color: isSelected ? '#1d4ed8' : '#1e293b', fontSize: 13, overflowWrap: 'anywhere' }}>{category}</strong>
                                            <span style={{ display: 'block', color: '#64748b', fontSize: 11, marginTop: 4 }}>
                                                {stats.count} ayrı ödeme kaydı · {formatCurrency(stats.total)}
                                            </span>
                                        </button>
                                        <div style={{ display: 'flex', flex: '0 0 auto', gap: 5 }}>
                                            <button
                                                type="button"
                                                aria-label={`${category} kalemini düzenle`}
                                                title="Kalem adını düzenle"
                                                onClick={() => { setNotice(null); setEditingCategory(category); setEditedCategoryName(category); }}
                                                disabled={busyCategory !== null}
                                                style={{ width: 34, height: 34, border: '1px solid #dbeafe', borderRadius: 8, background: '#eff6ff', color: '#2563eb', cursor: busyCategory !== null ? 'wait' : 'pointer', fontSize: 14 }}
                                            >
                                                ✎
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={`${category} kalemini sil`}
                                                title="Silme işlemi e-posta koduyla onaylanır"
                                                onClick={() => void handleRequestRemove(category)}
                                                disabled={busyCategory !== null}
                                                style={{ width: 34, height: 34, border: '1px solid #fee2e2', borderRadius: 8, background: '#fff7f7', color: '#dc2626', cursor: busyCategory !== null ? 'wait' : 'pointer', fontSize: 16, fontWeight: 700 }}
                                            >
                                                {busyCategory === category ? '…' : '×'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

        </section>
    );
};

export default ExpenseCategoryManager;
