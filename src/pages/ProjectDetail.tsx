import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { projectService } from '../services/projectService';
import { expenseService } from '../services/expenseService';
import { checkService } from '../services/checkService';
import { apartmentService } from '../services/apartmentService';
import { Project, Expense, Check, Apartment } from '../types';

const ProjectDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [project, setProject] = useState<Project | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [checks, setChecks] = useState<Check[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<'expenses' | 'checks' | 'apartments'>(
        tabParam === 'apartments' ? 'apartments' : 'expenses'
    );

    // Form states
    const [selectedPartner, setSelectedPartner] = useState('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [recipient, setRecipient] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    // Check form states
    const [showCheckModal, setShowCheckModal] = useState(false);
    const [checkFormData, setCheckFormData] = useState<Omit<Check, 'id' | 'user_id' | 'created_at'>>({
        check_number: '',
        amount: 0,
        company: '',
        category: '',
        vat_status: '',
        issuer: '',
        given_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        description: '',
        project_id: id || ''
    });
    const [editingCheckId, setEditingCheckId] = useState<string | null>(null);

    // Apartment modal states
    const [showApartmentModal, setShowApartmentModal] = useState(false);
    const [apartmentFormData, setApartmentFormData] = useState({
        building_name: '',
        apartment_number: '',
        floor: 1,
        square_meters: 0,
        price: 0,
        sold_price: 0,
        paid_amount: 0,
        status: 'available' as 'available' | 'owner' | 'sold',
        customer_name: '',
        customer_phone: '',
        project_id: id || ''
    });
    const [editingApartmentId, setEditingApartmentId] = useState<string | null>(null);

    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkFormData, setBulkFormData] = useState({
        startFloor: -1,
        endFloor: 5,
        basementApts: 2,
        groundApts: 2,
        normalApts: 4,
        hasDuplex: false,
        duplexCount: 2
    });

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

            // Çekleri yükle
            checkService.getChecks().then((allChecks) => {
                const projectChecks = allChecks.filter(c => c.project_id === id);
                setChecks(projectChecks);
            });

            // Daireleri yükle
            apartmentService.getApartments().then((allApartments) => {
                const projectApartments = allApartments.filter(a => a.project_id === id);
                setApartments(projectApartments);
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
            console.error('Error saving expense:', error);
            setErrorMsg(error.message || 'Üzgünüz, bir hata oluştu.');
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
        setErrorMsg(null);
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

    const handleDeleteConfirm = async () => {
        if (deleteConfirmCode === generatedSecurityCode) {
            try {
                if (deletingExpense) {
                    if (activeTab === 'expenses') {
                        await expenseService.deleteExpense(deletingExpense.id);
                        const allExpenses = await expenseService.getExpenses();
                        setExpenses(allExpenses.filter(e => e.project_id === id));
                    } else {
                        await checkService.deleteCheck(deletingExpense.id);
                        const allChecks = await checkService.getChecks();
                        setChecks(allChecks.filter(c => c.project_id === id));
                    }
                }
                setShowDeleteModal(false);
                setDeleteConfirmCode('');
                setGeneratedSecurityCode('');
                setDeletingExpense(null);
            } catch (error: any) {
                console.error('Error deleting:', error);
            }
        }
    };

    const handleAddCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        setSaving(true);
        setErrorMsg(null);

        try {
            if (editingCheckId) {
                await checkService.updateCheck(editingCheckId, { ...checkFormData, project_id: id });
            } else {
                await checkService.addCheck({ ...checkFormData, project_id: id }, '');
            }
            setShowCheckModal(false);
            setEditingCheckId(null);
            // Refresh checks
            const allChecks = await checkService.getChecks();
            setChecks(allChecks.filter(c => c.project_id === id));
        } catch (error: any) {
            console.error('Error saving check:', error);
            setErrorMsg(error.message || 'Çek kaydedilemedi.');
        } finally {
            setSaving(false);
        }
    };

    const handleEditCheck = (check: Check) => {
        setEditingCheckId(check.id);
        setCheckFormData({
            check_number: check.check_number,
            amount: check.amount,
            company: check.company,
            category: check.category,
            vat_status: check.vat_status || '',
            issuer: check.issuer,
            given_date: check.given_date,
            due_date: check.due_date,
            status: check.status,
            description: check.description || '',
            project_id: check.project_id || id || ''
        });
        setShowCheckModal(true);
    };

    const handleDeleteCheck = async (checkId: string, checkName: string) => {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        setGeneratedSecurityCode(code);
        setDeletingExpense({ id: checkId, name: checkName });
        setShowDeleteModal(true);
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

    const aptStats = apartments.reduce((stats, apt) => {
        stats.total++;
        if (apt.status === 'sold') {
            stats.soldCount++;
            stats.totalSoldPrice += (apt.sold_price || 0);
            stats.totalPaidAmount += (apt.paid_amount || 0);
        } else if (apt.status === 'owner') {
            stats.ownerCount++;
        }
        return stats;
    }, { total: 0, soldCount: 0, ownerCount: 0, totalSoldPrice: 0, totalPaidAmount: 0 });

    const totalRemaining = aptStats.totalSoldPrice - aptStats.totalPaidAmount;

    return (
        <Layout>
            <div>
                <div style={{
                    marginBottom: 'var(--spacing-xs)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-sm)',
                    background: 'white',
                    padding: 'var(--spacing-xs) var(--spacing-md)',
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

                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <button
                            className={`btn ${activeTab === 'expenses' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('expenses')}
                            style={{ padding: '0.4rem 1rem' }}
                        >
                            Giderler
                        </button>
                        <button
                            className={`btn ${activeTab === 'checks' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('checks')}
                            style={{ padding: '0.4rem 1rem' }}
                        >
                            Çekler
                        </button>
                        <button
                            className={`btn ${activeTab === 'apartments' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('apartments')}
                            style={{ padding: '0.4rem 1rem' }}
                        >
                            Daireler
                        </button>
                        <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 var(--spacing-xs)' }}></div>
                        {activeTab === 'apartments' && (
                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginRight: 'var(--spacing-xs)' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowBulkModal(true)}
                                    style={{ padding: '0.4rem 1rem' }}
                                >
                                    {apartments.length > 0 ? '🔄 Kat Planını Güncelle' : '🗺️ Kat Planı Oluştur'}
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={async () => {
                                        if (confirm('DİKKAT! Bu projedeki TÜM daireleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
                                            setLoading(true);
                                            try {
                                                for (const apt of apartments) {
                                                    await apartmentService.deleteApartment(apt.id);
                                                }
                                                setApartments([]);
                                                alert('Tüm daireler temizlendi.');
                                            } catch (error) {
                                                alert('Hata oluştu!');
                                            } finally {
                                                setLoading(false);
                                            }
                                        }
                                    }}
                                    style={{ padding: '0.4rem 1rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                                    title="Tüm Daireleri Sil"
                                >
                                    🗑️ Temizle
                                </button>
                            </div>
                        )}
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                if (activeTab === 'apartments') {
                                    setEditingApartmentId(null);
                                    setApartmentFormData({
                                        building_name: '',
                                        apartment_number: '',
                                        floor: 1,
                                        square_meters: 0,
                                        price: 0,
                                        sold_price: 0,
                                        paid_amount: 0,
                                        status: 'available',
                                        customer_name: '',
                                        customer_phone: '',
                                        project_id: id || ''
                                    });
                                }
                                activeTab === 'expenses' ? setShowExpenseModal(true) : activeTab === 'checks' ? setShowCheckModal(true) : setShowApartmentModal(true);
                            }}
                            style={{ padding: '0.4rem 1rem' }}
                        >
                            + {activeTab === 'expenses' ? 'Gider Ekle' : activeTab === 'checks' ? 'Çek Ekle' : 'Daire Satışı'}
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-xs)'
                }}>
                    {activeTab === 'expenses' || activeTab === 'checks' ? (
                        <>
                            <div className="card" style={{
                                padding: 'var(--spacing-xs) var(--spacing-md)',
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
                                    padding: 'var(--spacing-xs) var(--spacing-md)',
                                    background: 'white',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center'
                                }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', fontWeight: 600 }}>{partner.name.toUpperCase()} HARCAMA</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(getPartnerTotal(partner.id))}</div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.7 }}>%{partner.share_percentage}</div>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <>
                            <div className="card" style={{
                                padding: 'var(--spacing-xs) var(--spacing-md)',
                                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                                color: 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.9, fontWeight: 600 }}>TOPLAM SATIŞ</div>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{formatCurrency(aptStats.totalSoldPrice)}</div>
                                <div style={{ fontSize: '9px', opacity: 0.8 }}>{aptStats.soldCount} Daire Satıldı</div>
                            </div>
                            <div className="card" style={{
                                padding: 'var(--spacing-xs) var(--spacing-md)',
                                background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
                                color: 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.9, fontWeight: 600 }}>TOPLAM TAHSİLAT</div>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{formatCurrency(aptStats.totalPaidAmount)}</div>
                                <div style={{ fontSize: '9px', opacity: 0.8 }}>Kasaya Giren</div>
                            </div>
                            <div className="card" style={{
                                padding: 'var(--spacing-xs) var(--spacing-md)',
                                background: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)',
                                color: 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.9, fontWeight: 600 }}>TOPLAM KALAN</div>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{formatCurrency(totalRemaining)}</div>
                                <div style={{ fontSize: '9px', opacity: 0.8 }}>Bekleyen Alacak</div>
                            </div>
                            <div className="card" style={{
                                padding: 'var(--spacing-xs) var(--spacing-md)',
                                background: 'white',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', fontWeight: 600 }}>DAİRE DURUMU</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: 700 }}>{aptStats.total}</div>
                                        <div style={{ fontSize: '8px', opacity: 0.6 }}>TOPLAM</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>{aptStats.soldCount}</div>
                                        <div style={{ fontSize: '8px', opacity: 0.6 }}>SATILDI</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>{aptStats.ownerCount}</div>
                                        <div style={{ fontSize: '8px', opacity: 0.6 }}>M.SAHİBİ</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Content Table */}
                <div className="card" style={{ padding: 'var(--spacing-xs) var(--spacing-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
                        <h2 style={{ fontSize: 'var(--font-size-md)', margin: 0, color: 'var(--color-dark)' }}>
                            {activeTab === 'expenses' ? 'Gider Listesi' : activeTab === 'checks' ? 'Proje Çekleri' : 'Proje Daireleri'}
                        </h2>
                    </div>

                    {activeTab === 'expenses' ? (
                        expenses.length === 0 ? (
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
                        )
                    ) : activeTab === 'checks' ? (
                        checks.length === 0 ? (
                            <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                                Bu projeye ait henüz çek kaydı bulunmuyor.
                            </p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--color-bg)', borderBottom: '2px solid var(--color-border)' }}>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>ÇEK NO</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>FİRMA</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>VADE</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>TUTAR</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>DURUM</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>İŞLEMLER</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {checks.map((check) => (
                                            <tr key={check.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{check.check_number}</td>
                                                <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>{check.company}</td>
                                                <td style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                                                    {new Date(check.due_date).toLocaleDateString('tr-TR')}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                    {formatCurrency(check.amount)}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '10px',
                                                        background: check.status === 'paid' ? '#dcfce7' : '#fef9c3',
                                                        color: check.status === 'paid' ? '#15803d' : '#854d0e'
                                                    }}>
                                                        {check.status === 'paid' ? 'ÖDENDİ' : 'BEKLEMEDE'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => handleEditCheck(check)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                                            title="Düzenle"
                                                        >
                                                            📝
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCheck(check.id, check.company)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                                            title="Sil"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : activeTab === 'apartments' ? (
                        apartments.length === 0 ? (
                            <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                                Henüz daire eklenmemiş.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', gap: 'var(--spacing-lg)' }}>
                                {/* Sol Taraf - Daire Listesi (Excel benzeri) */}
                                <div style={{ flex: 1, overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--color-bg)', borderBottom: '2px solid var(--color-border)' }}>
                                                <th style={{ padding: '4px 8px', textAlign: 'left', fontSize: '10px', fontWeight: 600 }}>DAİRE</th>
                                                <th style={{ padding: '4px 8px', textAlign: 'right', fontSize: '10px', fontWeight: 600 }}>FİYAT</th>
                                                <th style={{ padding: '4px 8px', textAlign: 'right', fontSize: '10px', fontWeight: 600 }}>SATIŞ</th>
                                                <th style={{ padding: '4px 8px', textAlign: 'right', fontSize: '10px', fontWeight: 600 }}>ALINAN</th>
                                                <th style={{ padding: '4px 8px', textAlign: 'right', fontSize: '10px', fontWeight: 600 }}>KALAN</th>
                                                <th style={{ padding: '4px 8px', textAlign: 'center', fontSize: '10px', fontWeight: 600 }}>DURUM</th>
                                                <th style={{ padding: '4px 8px', textAlign: 'left', fontSize: '10px', fontWeight: 600, width: '100%' }}>MÜŞTERİ</th>
                                                <th style={{ padding: '4px 8px', textAlign: 'right', fontSize: '10px', fontWeight: 600 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {apartments
                                                .filter(a => a.status === 'sold') // Sadece satılanlar listede görünsün
                                                .sort((a, b) => {
                                                    if (b.floor !== a.floor) return b.floor - a.floor;
                                                    const numA = parseInt(a.apartment_number);
                                                    const numB = parseInt(b.apartment_number);
                                                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                                                    return a.apartment_number.localeCompare(b.apartment_number);
                                                })
                                                .map((apartment) => {
                                                    const soldPrice = apartment.sold_price || 0;
                                                    const paidAmount = apartment.paid_amount || 0;
                                                    const remaining = soldPrice - paidAmount;
                                                    return (
                                                        <tr key={apartment.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                            <td style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600 }}>
                                                                {apartment.apartment_number}
                                                            </td>
                                                            <td style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, textAlign: 'right', color: 'var(--color-text-light)' }}>
                                                                {formatCurrency(apartment.price)}
                                                            </td>
                                                            <td style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, textAlign: 'right', color: '#1e40af' }}>
                                                                {formatCurrency(soldPrice)}
                                                            </td>
                                                            <td style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, textAlign: 'right', color: '#10b981' }}>
                                                                {formatCurrency(paidAmount)}
                                                            </td>
                                                            <td style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, textAlign: 'right', color: '#ef4444' }}>
                                                                {formatCurrency(remaining)}
                                                            </td>
                                                            <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                                                                <span style={{
                                                                    padding: '1px 6px',
                                                                    borderRadius: '3px',
                                                                    fontSize: '9px',
                                                                    background: '#dcfce7',
                                                                    color: '#15803d'
                                                                }}>
                                                                    SAT
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '4px 8px', fontSize: '11px' }}>
                                                                {apartment.customer_name || '-'}
                                                            </td>
                                                            <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingApartmentId(apartment.id);
                                                                            setApartmentFormData({
                                                                                building_name: apartment.building_name,
                                                                                apartment_number: apartment.apartment_number,
                                                                                floor: apartment.floor,
                                                                                square_meters: apartment.square_meters,
                                                                                price: apartment.price,
                                                                                sold_price: apartment.sold_price || 0,
                                                                                paid_amount: apartment.paid_amount || 0,
                                                                                status: apartment.status,
                                                                                customer_name: apartment.customer_name || '',
                                                                                customer_phone: apartment.customer_phone || '',
                                                                                project_id: apartment.project_id || id || ''
                                                                            });
                                                                            setShowApartmentModal(true);
                                                                        }}
                                                                        style={{ padding: '4px 10px', fontSize: '12px', background: '#f3f4f6', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer' }}
                                                                        title="Düzenle"
                                                                    >
                                                                        ✏️
                                                                    </button>
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (confirm('Bu satışı iptal etmek ve daireyi tekrar "Müsait" hale getirmek istediğinize emin misiniz?')) {
                                                                                try {
                                                                                    await apartmentService.updateApartment(apartment.id, {
                                                                                        status: 'available',
                                                                                        customer_name: '',
                                                                                        customer_phone: '',
                                                                                        sold_price: 0,
                                                                                        paid_amount: 0
                                                                                    });
                                                                                    const allApartments = await apartmentService.getApartments();
                                                                                    setApartments(allApartments.filter(a => a.project_id === id));
                                                                                } catch (error) {
                                                                                    alert('Hata oluştu: ' + error);
                                                                                }
                                                                            }
                                                                        }}
                                                                        style={{ padding: '4px 10px', fontSize: '12px', background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5', borderRadius: '4px', cursor: 'pointer' }}
                                                                        title="Satışı İptal Et (Daireyi Boşa Çıkar)"
                                                                    >
                                                                        🔄
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Sağ Taraf - Bina Planı */}
                                <div style={{ width: 'fit-content', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-lg)', border: '1px solid var(--color-border)', flexShrink: 0 }}>
                                    <h3 style={{ fontSize: 'var(--font-size-md)', margin: '0 0 var(--spacing-md) 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>🏗️ Bina Planı</span>
                                        <span style={{ fontSize: '10px', fontWeight: 'normal', color: 'var(--color-text-light)', marginLeft: 'auto' }}>Tıklayarak düzenle</span>
                                    </h3>

                                    {apartments.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: 'var(--spacing-xl)' }}>
                                            <div style={{ fontSize: '3rem' }}>🏢</div>
                                            <div style={{ marginTop: 'var(--spacing-md)' }}>Daire ekleyin</div>
                                            <div style={{ fontSize: 'var(--font-size-xs)' }}>Plan otomatik oluşacak</div>
                                        </div>
                                    ) : (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            paddingBottom: 'var(--spacing-sm)',
                                            maxHeight: '600px',
                                            overflowY: 'auto'
                                        }}>
                                            {/* Katları grupla ve sırala */}
                                            {[...new Set(apartments.map(a => a.floor))].sort((a: any, b: any) => b - a).map(floor => {
                                                const floorApts = apartments.filter(a => a.floor === floor);

                                                const aptMap: { [key: number]: any } = {};
                                                floorApts.forEach(apt => {
                                                    const parts = apt.apartment_number.split('-');
                                                    const index = parseInt(parts[parts.length - 1]);
                                                    if (!isNaN(index)) aptMap[index] = apt;
                                                });

                                                return (
                                                    <div key={floor} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {/* Kat Etiketi */}
                                                        <div style={{
                                                            width: '50px',
                                                            minWidth: '50px',
                                                            fontSize: '9px',
                                                            fontWeight: 700,
                                                            textAlign: 'right',
                                                            color: 'var(--color-text-light)',
                                                            borderRight: '2px solid var(--color-border)',
                                                            paddingRight: '8px',
                                                            height: '35px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-end'
                                                        }}>
                                                            {Number(floor) === 0 ? 'ZEMİN' : Number(floor) < 0 ? `B${Math.abs(Number(floor))}` : `${floor}.K`}
                                                        </div>

                                                        {/* Daireler */}
                                                        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                                                            {floorApts
                                                                .sort((a, b) => {
                                                                    const aIdx = parseInt(a.apartment_number.split('-').pop() || '0');
                                                                    const bIdx = parseInt(b.apartment_number.split('-').pop() || '0');
                                                                    return aIdx - bIdx;
                                                                })
                                                                .map((apt: any) => {

                                                                    let bgColor = '#f8fafc';
                                                                    let textColor = '#64748b';
                                                                    let borderColor = '#e2e8f0';
                                                                    let label = apt.apartment_number;

                                                                    if (apt.status === 'sold') {
                                                                        bgColor = '#dcfce7'; textColor = '#15803d'; borderColor = '#bbf7d0';
                                                                        label = apt.customer_name || apt.apartment_number;
                                                                    } else if (apt.status === 'owner') {
                                                                        bgColor = '#fef9c3'; textColor = '#854d0e'; borderColor = '#fef08a';
                                                                        label = apt.customer_name || 'MAL';
                                                                    } else if (apt.status === 'available') {
                                                                        bgColor = '#eff6ff'; textColor = '#1e40af'; borderColor = '#dbeafe';
                                                                    }

                                                                    // Tek daireli katlarda kutucuk tüm genişliği kaplasın
                                                                    const boxWidth = floorApts.length === 1 ? '100%' : '50px';

                                                                    return (
                                                                        <div
                                                                            key={apt.id}
                                                                            title={apt.apartment_number}
                                                                            onClick={() => {
                                                                                setEditingApartmentId(apt.id);
                                                                                setApartmentFormData({ ...apt, project_id: apt.project_id || id || '' });
                                                                                setShowApartmentModal(true);
                                                                            }}
                                                                            style={{
                                                                                background: bgColor,
                                                                                color: textColor,
                                                                                borderRadius: '4px',
                                                                                fontSize: '9px',
                                                                                fontWeight: 800,
                                                                                cursor: 'pointer',
                                                                                border: `1px solid ${borderColor}`,
                                                                                width: boxWidth,
                                                                                height: '35px',
                                                                                display: 'flex',
                                                                                flexDirection: 'column',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                                                transition: 'all 0.2s'
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                                                                                e.currentTarget.style.zIndex = '10';
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                                                                e.currentTarget.style.zIndex = '1';
                                                                            }}
                                                                        >
                                                                            <div>{apt.apartment_number}</div>
                                                                            {apt.status !== 'available' && (
                                                                                <div style={{ fontSize: '6px', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                                                                    {label.split(' ')[0]}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Renk Açıklamaları */}
                                            <div style={{
                                                marginTop: 'var(--spacing-md)',
                                                padding: 'var(--spacing-sm)',
                                                background: 'white',
                                                borderRadius: '4px',
                                                fontSize: '9px',
                                                border: '1px solid var(--color-border)'
                                            }}>
                                                <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-light)' }}>BİNA PLANI RENKLERİ:</div>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <div style={{ width: '8px', height: '8px', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '2px' }}></div>
                                                        <span>Müsait</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <div style={{ width: '8px', height: '8px', background: '#fef9c3', border: '1px solid #fef08a', borderRadius: '2px' }}></div>
                                                        <span>Mal Sahibi</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <div style={{ width: '8px', height: '8px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '2px' }}></div>
                                                        <span>Satıldı</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        )
                    ) : null}
                </div>

                {/* Add Expense Modal */}
                {
                    showExpenseModal && (
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

                                        {errorMsg && (
                                            <div style={{
                                                padding: '10px',
                                                background: '#fee2e2',
                                                color: '#991b1b',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                border: '1px solid #fecaca',
                                                marginTop: 'var(--spacing-md)'
                                            }}>
                                                ⚠️ {errorMsg}
                                            </div>
                                        )}
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
                    )
                }

                {/* Delete Expense Modal */}
                {
                    showDeleteModal && (
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
                                <h2 className="mb-md">{activeTab === 'expenses' ? 'Gideri Sil' : 'Çeki Sil'}</h2>
                                <p className="mb-lg" style={{ color: 'var(--color-text-light)' }}>
                                    <strong>{deletingExpense?.name}</strong> kaydını silmek için şu kodu girin: <strong style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>{generatedSecurityCode}</strong>
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
                                        onClick={handleDeleteConfirm}
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
                    )
                }
                {/* Add Check Modal */}
                {
                    showCheckModal && (
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
                                width: 'min(100%, 500px)',
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
                                        {editingCheckId ? 'Çeki Düzenle' : 'Yeni Çek Ekle'}
                                    </h1>
                                    <button onClick={() => setShowCheckModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-light)' }}>×</button>
                                </div>

                                <div style={{ padding: 'var(--spacing-lg)', overflowY: 'auto' }}>
                                    <form onSubmit={handleAddCheck}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)', gridColumn: 'span 2' }}>
                                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>FİRMA ADI</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={checkFormData.company}
                                                    onChange={(e) => setCheckFormData({ ...checkFormData, company: e.target.value })}
                                                    placeholder="Örn: ÖZYILMAZLAR"
                                                    required
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>ÇEK NO</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={checkFormData.check_number}
                                                    onChange={(e) => setCheckFormData({ ...checkFormData, check_number: e.target.value })}
                                                    placeholder="000123"
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>TUTAR (₺)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={checkFormData.amount}
                                                    onChange={(e) => setCheckFormData({ ...checkFormData, amount: Number(e.target.value) })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>VADE TARİHİ</label>
                                                <input
                                                    type="date"
                                                    className="form-input"
                                                    value={checkFormData.due_date}
                                                    onChange={(e) => setCheckFormData({ ...checkFormData, due_date: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>KULLANILACAK YER</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={checkFormData.category}
                                                    onChange={(e) => setCheckFormData({ ...checkFormData, category: e.target.value })}
                                                    placeholder="Örn: BETON"
                                                    required
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>KDV DURUMU</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={checkFormData.vat_status || ''}
                                                    onChange={(e) => setCheckFormData({ ...checkFormData, vat_status: e.target.value })}
                                                    placeholder="Örn: KDV DAHİL"
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.7rem' }}>ÇEKİ VERECEK KİŞİ</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={checkFormData.issuer || ''}
                                                    onChange={(e) => setCheckFormData({ ...checkFormData, issuer: e.target.value })}
                                                    placeholder="Örn: ERHANLAR"
                                                />
                                            </div>
                                        </div>

                                        {errorMsg && (
                                            <div style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: 'var(--spacing-md)' }}>
                                                ⚠️ {errorMsg}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                style={{ flex: 1 }}
                                                disabled={saving}
                                            >
                                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => setShowCheckModal(false)}
                                                style={{ flex: 1 }}
                                            >
                                                İptal
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Add Apartment Modal */}
                {showApartmentModal && (
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
                            width: 'min(100%, 500px)',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            padding: 'var(--spacing-lg)'
                        }}>
                            <h2 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-lg)' }}>
                                {editingApartmentId ? 'Daire Düzenle' : 'Yeni Daire Ekle'}
                            </h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    // Temizlik: NaN değerleri engelle
                                    const cleanData = {
                                        ...apartmentFormData,
                                        price: Number(apartmentFormData.price) || 0,
                                        sold_price: Number(apartmentFormData.sold_price) || 0,
                                        paid_amount: Number(apartmentFormData.paid_amount) || 0,
                                        square_meters: Number(apartmentFormData.square_meters) || 0,
                                        floor: Number(apartmentFormData.floor) || 0
                                    };

                                    if (editingApartmentId) {
                                        // Güncelleme yaparken project_id'yi göndermeye gerek yok
                                        const { project_id, ...updateData } = cleanData;
                                        await apartmentService.updateApartment(editingApartmentId, updateData);
                                    } else {
                                        await apartmentService.addApartment(cleanData, project?.user_id || '');
                                    }
                                    setShowApartmentModal(false);
                                    setEditingApartmentId(null);
                                    setApartmentFormData({
                                        building_name: '',
                                        apartment_number: '',
                                        floor: 1,
                                        square_meters: 0,
                                        price: 0,
                                        sold_price: 0,
                                        paid_amount: 0,
                                        status: 'available',
                                        customer_name: '',
                                        customer_phone: '',
                                        project_id: id || ''
                                    });
                                    // Refresh apartments
                                    const allApartments = await apartmentService.getApartments();
                                    const projectApartments = allApartments.filter(a => a.project_id === id);
                                    setApartments(projectApartments);
                                } catch (error: any) {
                                    console.error('Daire hatası:', error);
                                    alert(`Hata: ${error.message || 'Daire işlemi sırasında bir hata oluştu!'}`);
                                }
                            }}>
                                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                            Bina Adı
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={apartmentFormData.building_name}
                                            onChange={(e) => setApartmentFormData({ ...apartmentFormData, building_name: e.target.value })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                Daire No
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={apartmentFormData.apartment_number}
                                                onChange={(e) => setApartmentFormData({ ...apartmentFormData, apartment_number: e.target.value })}
                                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                Kat
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                value={apartmentFormData.floor}
                                                onChange={(e) => setApartmentFormData({ ...apartmentFormData, floor: parseInt(e.target.value) })}
                                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                M² (Brüt)
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                value={apartmentFormData.square_meters}
                                                onChange={(e) => setApartmentFormData({ ...apartmentFormData, square_meters: parseFloat(e.target.value) })}
                                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                Daire Liste Fiyatı
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                value={apartmentFormData.price}
                                                onChange={(e) => setApartmentFormData({ ...apartmentFormData, price: parseFloat(e.target.value) })}
                                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                            Durum
                                        </label>
                                        <select
                                            value={apartmentFormData.status}
                                            onChange={(e) => {
                                                const newStatus = e.target.value as 'available' | 'owner' | 'sold';
                                                setApartmentFormData({
                                                    ...apartmentFormData,
                                                    status: newStatus,
                                                    price: newStatus === 'owner' ? 0 : apartmentFormData.price,
                                                    sold_price: newStatus === 'sold' ? (apartmentFormData.sold_price || apartmentFormData.price) : 0,
                                                    paid_amount: newStatus === 'sold' ? apartmentFormData.paid_amount : 0
                                                });
                                            }}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                        >
                                            <option value="available">Müsait</option>
                                            <option value="owner">Mal Sahibi</option>
                                            <option value="sold">Satıldı</option>
                                        </select>
                                    </div>

                                    {apartmentFormData.status === 'sold' && (
                                        <div style={{ padding: 'var(--spacing-md)', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'grid', gap: 'var(--spacing-sm)' }}>
                                            <h4 style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Satış Detayları</h4>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Kaça Satıldı?</label>
                                                    <input
                                                        type="number"
                                                        value={apartmentFormData.sold_price}
                                                        onChange={(e) => setApartmentFormData({ ...apartmentFormData, sold_price: parseFloat(e.target.value) })}
                                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#1e40af' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Aldığım (Peşinat/Ara Öd.)</label>
                                                    <input
                                                        type="number"
                                                        value={apartmentFormData.paid_amount}
                                                        onChange={(e) => setApartmentFormData({ ...apartmentFormData, paid_amount: parseFloat(e.target.value) })}
                                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#10b981' }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#fff5f5', borderRadius: '4px', border: '1px dashed #feb2b2' }}>
                                                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: '#c53030' }}>KALAN ALACAK:</span>
                                                <span style={{ fontWeight: 'bold', color: '#c53030' }}>
                                                    {formatCurrency((apartmentFormData.sold_price || 0) - (apartmentFormData.paid_amount || 0))}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                {apartmentFormData.status === 'owner' ? 'Mal Sahibi Adı' : 'Müşteri Adı (Opsiyonel)'}
                                            </label>
                                            <input
                                                type="text"
                                                value={apartmentFormData.customer_name}
                                                onChange={(e) => setApartmentFormData({ ...apartmentFormData, customer_name: e.target.value })}
                                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                Müşteri Telefon (Opsiyonel)
                                            </label>
                                            <input
                                                type="tel"
                                                value={apartmentFormData.customer_phone}
                                                onChange={(e) => setApartmentFormData({ ...apartmentFormData, customer_phone: e.target.value })}
                                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                                        {editingApartmentId ? 'Güncelle' : 'Kaydet'}
                                    </button>
                                    {editingApartmentId && (
                                        <button
                                            type="button"
                                            className="btn"
                                            onClick={async () => {
                                                if (confirm('Bu daireyi silmek istediğinize emin misiniz?')) {
                                                    await apartmentService.deleteApartment(editingApartmentId);
                                                    setShowApartmentModal(false);
                                                    setEditingApartmentId(null);
                                                    const allApartments = await apartmentService.getApartments();
                                                    setApartments(allApartments.filter(a => a.project_id === id));
                                                }
                                            }}
                                            style={{ flex: 1, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                                        >
                                            Sil
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setShowApartmentModal(false);
                                            setEditingApartmentId(null);
                                        }}
                                        style={{ flex: 1 }}
                                    >
                                        İptal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Bulk Apartment Generation Modal */}
                {showBulkModal && (
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
                            width: 'min(100%, 400px)',
                            padding: 'var(--spacing-lg)'
                        }}>
                            <h2 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-lg)' }}>
                                {apartments.length > 0 ? 'Kat Planını Güncelle' : 'Toplu Kat Planı Oluştur'}
                            </h2>
                            <p style={{ fontSize: '11px', color: 'var(--color-text-light)', marginBottom: 'var(--spacing-md)' }}>
                                Belirlediğiniz kat aralığında her kat için istenen sayıda boş daire oluşturur.
                            </p>
                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                                            En Alt Kat (Bodrum: -1)
                                        </label>
                                        <input
                                            type="number"
                                            value={bulkFormData.startFloor}
                                            onChange={(e) => setBulkFormData({ ...bulkFormData, startFloor: parseInt(e.target.value) })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                                            En Üst Kat No
                                        </label>
                                        <input
                                            type="number"
                                            value={bulkFormData.endFloor}
                                            onChange={(e) => setBulkFormData({ ...bulkFormData, endFloor: parseInt(e.target.value) })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                                            Bodrumda Kaç?
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={bulkFormData.basementApts}
                                            onChange={(e) => setBulkFormData({ ...bulkFormData, basementApts: parseInt(e.target.value) })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                                            Zeminde Kaç?
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={bulkFormData.groundApts}
                                            onChange={(e) => setBulkFormData({ ...bulkFormData, groundApts: parseInt(e.target.value) })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                                            Ara Katta Kaç?
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={bulkFormData.normalApts}
                                            onChange={(e) => setBulkFormData({ ...bulkFormData, normalApts: parseInt(e.target.value) })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                        <input
                                            type="checkbox"
                                            checked={bulkFormData.hasDuplex}
                                            onChange={(e) => setBulkFormData({ ...bulkFormData, hasDuplex: e.target.checked })}
                                        />
                                        En Üst Kat Dubleks mi?
                                    </label>

                                    {bulkFormData.hasDuplex && (
                                        <div style={{ marginTop: '10px' }}>
                                            <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                                                Kaç Adet Dubleks Var?
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={bulkFormData.duplexCount}
                                                onChange={(e) => setBulkFormData({ ...bulkFormData, duplexCount: parseInt(e.target.value) })}
                                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    onClick={async () => {
                                        try {
                                            if (!confirm('Bu işlem seçilen ayarlara göre yeni daireler oluşturacaktır. Devam edilsin mi?')) return;

                                            setLoading(true);
                                            const newApartments: any[] = [];

                                            for (let f = bulkFormData.startFloor; f <= bulkFormData.endFloor; f++) {
                                                let aptCount = bulkFormData.normalApts;

                                                if (f < 0) {
                                                    aptCount = bulkFormData.basementApts;
                                                } else if (f === 0) {
                                                    aptCount = bulkFormData.groundApts;
                                                } else if (f === bulkFormData.endFloor && bulkFormData.hasDuplex) {
                                                    aptCount = bulkFormData.duplexCount;
                                                }

                                                for (let d = 1; d <= aptCount; d++) {
                                                    const isDuplex = f === bulkFormData.endFloor && bulkFormData.hasDuplex;
                                                    newApartments.push({
                                                        building_name: project?.name || 'Bina',
                                                        apartment_number: `${f < 0 ? 'B' + Math.abs(f) : f === 0 ? 'Z' : f}-${d}${isDuplex ? ' (DBX)' : ''}`,
                                                        floor: f,
                                                        square_meters: isDuplex ? 200 : 100,
                                                        price: 0,
                                                        status: 'available',
                                                        project_id: id || ''
                                                    });
                                                }
                                            }

                                            if (newApartments.length > 0) {
                                                await apartmentService.bulkAddApartments(newApartments, project?.user_id || '');
                                            }

                                            alert('Kat planı başarıyla oluşturuldu!');
                                            setShowBulkModal(false);
                                            // Refresh apartments
                                            const allApartments = await apartmentService.getApartments();
                                            setApartments(allApartments.filter(a => a.project_id === id));
                                        } catch (error) {
                                            console.error(error);
                                            alert('Hata oluştu!');
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                >
                                    {apartments.length > 0 ? 'Planı Güncelle' : 'Planı Oluştur'}
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                    onClick={() => setShowBulkModal(false)}
                                >
                                    İptal
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div >
        </Layout >
    );
};

export default ProjectDetail;
