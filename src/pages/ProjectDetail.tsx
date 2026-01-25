import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { projectService } from '../services/projectService';
import { expenseService } from '../services/expenseService';
import { checkService } from '../services/checkService';
import { apartmentService } from '../services/apartmentService';
import { Project, Expense, Check, Apartment } from '../types';
import { supabase } from '../config/supabase';

// Components
import FloorPlan from './ProjectDetail/FloorPlan';
import ExpenseTable from './ProjectDetail/ExpenseTable';
import CheckTable from './ProjectDetail/CheckTable';
import ApartmentTable from './ProjectDetail/ApartmentTable';
import SummaryCards from './ProjectDetail/SummaryCards';
import QRCode from '../components/QRCode';

// Modals
import ExpenseModal from './ProjectDetail/Modals/ExpenseModal';
import CheckModal from './ProjectDetail/Modals/CheckModal';
import ApartmentModal from './ProjectDetail/Modals/ApartmentModal';
import BulkModal from './ProjectDetail/Modals/BulkModal';

const ProjectDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [project, setProject] = useState<Project | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [checks, setChecks] = useState<Check[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTabState] = useState<'expenses' | 'checks' | 'apartments'>(
        tabParam === 'apartments' ? 'apartments' : (tabParam === 'checks' ? 'checks' : 'expenses')
    );

    const setActiveTab = (tab: 'expenses' | 'checks' | 'apartments') => {
        setActiveTabState(tab);
        navigate(`/projeler/${id}?tab=${tab}`, { replace: true });
    };

    // Modal Visibility
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showCheckModal, setShowCheckModal] = useState(false);
    const [showApartmentModal, setShowApartmentModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Form States
    const [selectedPartner, setSelectedPartner] = useState('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [recipient, setRecipient] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

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
        notification_email: '',
        notification_email_2: '',
        notification_email_3: '',
        project_id: id || ''
    });
    const [editingCheckId, setEditingCheckId] = useState<string | null>(null);

    const [apartmentFormData, setApartmentFormData] = useState({
        building_name: '',
        apartment_number: '',
        floor: 1,
        square_meters: 0,
        price: 0,
        sold_price: 0,
        paid_amount: 0,
        status: 'available' as any,
        customer_name: '',
        customer_phone: '',
        sort_order: 0,
        plan_files: [] as any[],
        project_id: id || ''
    });
    const [editingApartmentId, setEditingApartmentId] = useState<string | null>(null);

    // Search Logic
    const [searchTerm, setSearchTerm] = useState('');

    const filteredExpenses = expenses.filter(e => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const partnerName = project?.partners?.find(p => p.id === e.partner_id)?.name?.toLowerCase() || '';
        return (
            e.description?.toLowerCase().includes(term) ||
            e.category?.toLowerCase().includes(term) ||
            e.recipient?.toLowerCase().includes(term) ||
            e.payment_method?.toLowerCase().includes(term) ||
            partnerName.includes(term) ||
            e.amount.toString().includes(term)
        );
    });

    const filteredChecks = checks.filter(c => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            c.check_number.toLowerCase().includes(term) ||
            c.company.toLowerCase().includes(term) ||
            c.issuer.toLowerCase().includes(term) ||
            c.description?.toLowerCase().includes(term) ||
            c.amount.toString().includes(term)
        );
    });

    const filteredApartments = apartments.filter(a => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            a.apartment_number.toString().includes(term) ||
            a.building_name.toLowerCase().includes(term) ||
            a.customer_name?.toLowerCase().includes(term) ||
            a.customer_phone?.toLowerCase().includes(term) ||
            a.price.toString().includes(term)
        );
    });

    // Collapsible Panels State
    const [showQRSection, setShowQRSection] = useState(false);
    const [showCompanySection, setShowCompanySection] = useState(false);

    // Firma Bilgileri State (Proje Özel)
    const [companyInfo, setCompanyInfo] = useState({
        company_name: '',
        company_address: '',
        company_location: '',
        whatsapp_number: '',
        notification_emails: [] as string[]
    });

    const [bulkFormData, setBulkFormData] = useState({
        startFloor: -1,
        endFloor: 5,
        basementApts: 2,
        groundApts: 2,
        normalApts: 4,
        hasDuplex: false,
        duplexCount: 2
    });

    const [deletingExpense, setDeletingExpense] = useState<{ id: string, name: string } | null>(null);
    const [deleteConfirmCode, setDeleteConfirmCode] = useState('');
    const [receivedCode, setReceivedCode] = useState('');
    const [sendingCode, setSendingCode] = useState(false);
    const [actionType, setActionType] = useState<'expense' | 'check' | 'apartment_reset'>('expense');
    const [saving, setSaving] = useState(false);

    // Loading States for individual sections
    const [loadingExpenses, setLoadingExpenses] = useState(false);
    const [loadingChecks, setLoadingChecks] = useState(false);
    const [loadingApartments, setLoadingApartments] = useState(false);

    const loadAllData = React.useCallback(async (showSpinner = true) => {
        if (!id) return;

        // Phase 1: Critical Data (Project Info)
        if (showSpinner && !project) setLoading(true);

        try {
            // First fetch project details only (ID param can be slug or UUID)
            const proj = await projectService.getProjectBySlug(id);
            if (!proj) throw new Error('Proje bulunamadı');

            setProject(proj);
            // If the URL is using slug but state has ID, that's fine.
            // If we want to force URL to slug, we could do it here but let's keep it simple.

            // ... (keep companyInfo logic same) ...
            setCompanyInfo({
                company_name: proj.company_name || '',
                company_address: proj.company_address || '',
                company_location: proj.company_location || '',
                whatsapp_number: proj.whatsapp_number || '',
                notification_emails: proj.notification_emails || []
            });

            if (proj.partners && proj.partners.length > 0 && !selectedPartner) {
                setSelectedPartner(proj.partners[0].id);
            }

            setLoading(false); // Unblock main UI

            // Phase 2: Independent Parallel Fetching
            setLoadingExpenses(true);
            expenseService.getExpenses(id)
                .then(data => setExpenses(data))
                .catch(console.error)
                .finally(() => setLoadingExpenses(false));

            setLoadingChecks(true);
            checkService.getChecks(id)
                .then(data => setChecks(data))
                .catch(console.error)
                .finally(() => setLoadingChecks(false));

            setLoadingApartments(true);
            apartmentService.getApartments(id)
                .then(data => setApartments(data))
                .catch(console.error)
                .finally(() => setLoadingApartments(false));

        } catch (err) {
            console.error(err);
            if (showSpinner) navigate('/projeler');
            setLoading(false);
        }
    }, [id, navigate, selectedPartner]);

    useEffect(() => {
        const handleRefresh = () => {
            if (id) {
                // Background refresh shouldn't show global spinner
                loadAllData(false);
            }
        };

        window.addEventListener('system-refresh', handleRefresh);

        if (id) {
            loadAllData(true);
        }

        return () => {
            window.removeEventListener('system-refresh', handleRefresh);
        };
    }, [id, loadAllData]);


    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0
        }).format(value);
    };

    const getPartnerTotal = (partnerId: string) => {
        return expenses.filter(e => e.partner_id === partnerId).reduce((sum, e) => sum + e.amount, 0);
    };

    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            const data = {
                date: expenseDate,
                category,
                description,
                amount: Number(amount.replace(/\./g, '')),
                project_id: id,
                partner_id: selectedPartner || undefined,
                payment_method: paymentMethod,
                recipient
            };

            if (editingExpenseId) {
                await expenseService.updateExpense(editingExpenseId, data);
            } else {
                await expenseService.addExpense(data);
            }
            setShowExpenseModal(false);
            setEditingExpenseId(null);
            loadAllData(false);
        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving || !id) return;
        setSaving(true);
        try {
            if (editingCheckId) {
                await checkService.updateCheck(editingCheckId, { ...checkFormData, project_id: id });
            } else {
                await checkService.addCheck({ ...checkFormData, project_id: id }, user?.id || '');
            }
            setShowCheckModal(false);
            setEditingCheckId(null);
            loadAllData(false);
        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = async (id: string, name: string) => {
        setSendingCode(true);
        const type = activeTab === 'expenses' ? 'expense' : 'check';
        setActionType(type);
        setDeletingExpense({ id, name });

        try {
            const { data, error } = await supabase.functions.invoke('send-delete-code', {
                body: {
                    targetName: name,
                    actionType: type,
                    userEmail: user?.email
                }
            });

            if (error) throw error;
            if (data?.code) {
                setReceivedCode(data.code);
                setShowDeleteModal(true);
            }
        } catch (error: any) {
            console.error('Full Error:', error);
            const errorMsg = error.context?.error?.message || error.message || 'Bilinmeyen bir hata oluştu';
            alert('Güvenlik kodu gönderilemedi: ' + errorMsg);
        } finally {
            setSendingCode(false);
        }
    };

    const handleApartmentResetClick = async (apt: Apartment) => {
        setSendingCode(true);
        const name = `${apt.building_name} No:${apt.apartment_number} (Satış İptali)`;
        setActionType('apartment_reset');
        setDeletingExpense({ id: apt.id, name });

        try {
            const { data, error } = await supabase.functions.invoke('send-delete-code', {
                body: {
                    targetName: name,
                    actionType: 'apartment_reset',
                    userEmail: user?.email
                }
            });

            if (error) throw error;
            if (data?.code) {
                setReceivedCode(data.code);
                setShowDeleteModal(true);
            }
        } catch (error: any) {
            console.error('Full Error:', error);
            const errorMsg = error.context?.error?.message || error.message || 'Bilinmeyen bir hata oluştu';
            alert('Güvenlik kodu gönderilemedi: ' + errorMsg);
        } finally {
            setSendingCode(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (deleteConfirmCode === receivedCode && deletingExpense) {
            try {
                if (actionType === 'expense') {
                    await expenseService.deleteExpense(deletingExpense.id);
                } else if (actionType === 'check') {
                    await checkService.deleteCheck(deletingExpense.id);
                } else if (actionType === 'apartment_reset') {
                    await apartmentService.updateApartment(deletingExpense.id, {
                        status: 'available',
                        customer_name: '',
                        customer_phone: '',
                        sold_price: 0,
                        paid_amount: 0
                    });
                }
                setShowDeleteModal(false);
                setDeleteConfirmCode('');
                setReceivedCode('');
                setDeletingExpense(null);
                setDeletingExpense(null);
                loadAllData(false);
            } catch (err) { console.error(err); }
        } else {
            alert('Girdiğiniz kod hatalı. Lütfen meilinizi kontrol edin.');
        }
    };

    if (loading || !project) {
        return <Layout><div className="loading-container"><div className="spinner"></div></div></Layout>;
    }

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

    const generalTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <Layout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>


                {/* Second Row - Actions & Summaries */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between', // Push to edges
                    background: 'white',
                    padding: 'var(--spacing-xs) var(--spacing-md)',
                    borderRadius: 'var(--border-radius-lg)',
                    boxShadow: 'var(--shadow-sm)',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-md)'
                }}>
                    {/* Left Side: Actions */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-md)'
                    }}>
                        <button className="btn btn-primary" onClick={() => {
                            if (activeTab === 'expenses') setShowExpenseModal(true);
                            else if (activeTab === 'checks') setShowCheckModal(true);
                            else { setEditingApartmentId(null); setApartmentFormData({ ...apartmentFormData, status: 'sold' }); setShowApartmentModal(true); }
                        }} style={{ height: '40px', padding: '0 1.2rem', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                            + {activeTab === 'expenses' ? 'Gider Ekle' : activeTab === 'checks' ? 'Çek Ekle' : 'Daire Satışı'}
                        </button>

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px', height: '40px', alignItems: 'center' }}>
                            <button className={`btn`} onClick={() => setActiveTab('expenses')} style={{ height: '100%', padding: '0 1rem', fontSize: '11px', background: activeTab === 'expenses' ? 'white' : 'transparent', color: activeTab === 'expenses' ? 'var(--color-primary)' : '#64748b', border: 'none', boxShadow: activeTab === 'expenses' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: 600 }}>Giderler</button>
                            <button className={`btn`} onClick={() => setActiveTab('checks')} style={{ height: '100%', padding: '0 1rem', fontSize: '11px', background: activeTab === 'checks' ? 'white' : 'transparent', color: activeTab === 'checks' ? 'var(--color-primary)' : '#64748b', border: 'none', boxShadow: activeTab === 'checks' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: 600 }}>Çekler</button>
                            <button className={`btn`} onClick={() => setActiveTab('apartments')} style={{ height: '100%', padding: '0 1rem', fontSize: '11px', background: activeTab === 'apartments' ? 'white' : 'transparent', color: activeTab === 'apartments' ? 'var(--color-primary)' : '#64748b', border: 'none', boxShadow: activeTab === 'apartments' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: 600 }}>Daireler</button>
                        </div>

                        {activeTab === 'apartments' && (
                            <>
                                <button className="btn btn-secondary" onClick={() => setShowBulkModal(true)} style={{ height: '40px', padding: '0 1rem', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    🗺️ {apartments.length === 0 ? 'Kat Planı Oluştur' : 'Kat Planı Güncelle'}
                                </button>
                            </>
                        )}
                    </div>

                    {/* Right Side: Summaries */}
                    <SummaryCards activeTab={activeTab} generalTotal={generalTotal} project={project} getPartnerTotal={getPartnerTotal} aptStats={aptStats} formatCurrency={formatCurrency} />
                </div>


                {/* Main Content Area */}
                <div className="project-detail-main" style={{
                    padding: 'var(--spacing-md)',
                    display: 'flex',
                    gap: 'var(--spacing-lg)',
                    minHeight: '500px'
                }}>

                    {/* Left Column - Main Table */}
                    <div className="table-column" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                            <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 800, margin: 0, color: 'var(--color-dark)' }}>
                                {activeTab === 'expenses' ? 'Proje Giderleri' : activeTab === 'checks' ? 'Proje Çekleri' : 'Proje Daireleri'}
                            </h2>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        padding: '8px 12px 8px 32px',
                                        borderRadius: '20px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '13px',
                                        width: '200px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        background: '#f8fafc'
                                    }}
                                    onFocus={(e) => { e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'; }}
                                    onBlur={(e) => { e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                                />
                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', opacity: 0.5 }}>🔍</span>
                            </div>
                        </div>

                        {activeTab === 'expenses' && <ExpenseTable expenses={filteredExpenses} project={project} formatCurrency={formatCurrency} loading={loadingExpenses} onEdit={(e) => { setEditingExpenseId(e.id); setExpenseDate(e.date); setCategory(e.category); setAmount(new Intl.NumberFormat('tr-TR').format(e.amount)); setSelectedPartner(e.partner_id || ''); setPaymentMethod(e.payment_method || ''); setRecipient(e.recipient || ''); setDescription(e.description); setShowExpenseModal(true); }} onDelete={handleDeleteClick} sendingCode={sendingCode} />}
                        {activeTab === 'checks' && <CheckTable checks={filteredChecks} formatCurrency={formatCurrency} loading={loadingChecks} onEdit={(c) => {
                            setEditingCheckId(c.id);
                            setCheckFormData({
                                check_number: c.check_number,
                                amount: c.amount,
                                company: c.company,
                                category: c.category,
                                vat_status: c.vat_status || '',
                                issuer: c.issuer,
                                given_date: c.given_date,
                                due_date: c.due_date,
                                status: c.status,
                                description: c.description || '',
                                notification_email: c.notification_email || '',
                                notification_email_2: (c as any).notification_email_2 || '',
                                notification_email_3: (c as any).notification_email_3 || '',
                                project_id: c.project_id || id || ''
                            });
                            setShowCheckModal(true);
                        }} onDelete={handleDeleteClick} sendingCode={sendingCode} />}
                        {activeTab === 'apartments' && <ApartmentTable apartments={filteredApartments} formatCurrency={formatCurrency} loading={loadingApartments} onEdit={(a) => { setEditingApartmentId(a.id); setApartmentFormData({ ...a, sold_price: a.sold_price || 0, paid_amount: a.paid_amount || 0, customer_name: a.customer_name || '', customer_phone: a.customer_phone || '', sort_order: a.sort_order || 0, plan_files: a.plan_files || [], project_id: a.project_id || id || '' }); setShowApartmentModal(true); }} onReset={handleApartmentResetClick} sendingCode={sendingCode} />}
                    </div>

                    {/* Right Column - Floor Plan (Fixed side) */}
                    <div className="floor-plan-column" style={{ width: '350px', borderLeft: '2px solid var(--color-border)', paddingLeft: 'var(--spacing-lg)', paddingRight: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>

                        {activeTab === 'apartments' && (
                            <div className="card" style={{
                                padding: 'var(--spacing-xs) var(--spacing-md)',
                                background: 'white',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                marginBottom: '4px'
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
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '2px' }}>{project.name.toUpperCase()}</div>
                                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>🏢 Bina Planı</h3>
                            </div>
                            <span style={{ fontSize: '9px', color: 'var(--color-text-light)' }}>Tıklayarak düzenle</span>
                        </div>
                        <FloorPlan apartments={apartments} onApartmentClick={(a) => {
                            setEditingApartmentId(a.id);
                            setApartmentFormData({ ...a, sold_price: a.sold_price || 0, paid_amount: a.paid_amount || 0, customer_name: a.customer_name || '', customer_phone: a.customer_phone || '', sort_order: a.sort_order || 0, plan_files: a.plan_files || [], project_id: a.project_id || id || '' });
                            setShowApartmentModal(true);
                        }} />

                        {/* QR Code Section - Only on apartments tab */}
                        {activeTab === 'apartments' && project.public_code && (
                            <div style={{ padding: 'var(--spacing-sm)', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: 'var(--spacing-md)' }}>
                                <div
                                    onClick={() => setShowQRSection(!showQRSection)}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        marginBottom: showQRSection ? '8px' : '0'
                                    }}
                                >
                                    <h3 style={{ fontSize: '11px', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        📱 Karekod Satış
                                    </h3>
                                    <span style={{ fontSize: '10px', transition: 'transform 0.2s', transform: showQRSection ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                                        {showQRSection ? '▼' : '◀'}
                                    </span>
                                </div>

                                {showQRSection && (
                                    <>
                                        <p style={{ fontSize: '9px', color: 'var(--color-text-light)', margin: 0, marginBottom: '8px' }}>
                                            Binaya asın, müşteriler görsün
                                        </p>
                                        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                            <a
                                                href={`https://www.insaathesapp.com/p/${project.public_code}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-secondary"
                                                style={{ fontSize: '9px', padding: '0.3rem 0.6rem', flex: 1 }}
                                            >
                                                🔗 Sayfa
                                            </a>
                                            <button
                                                onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.download = `${project.name}-qr.png`;
                                                    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent('https://www.insaathesapp.com/p/' + project.public_code)}`;
                                                    link.click();
                                                }}
                                                className="btn"
                                                style={{ fontSize: '9px', padding: '0.3rem 0.6rem', background: '#10b981', color: 'white', flex: 1 }}
                                            >
                                                💾 İndir
                                            </button>
                                        </div>
                                        {/* QR Kod */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <QRCode
                                                value={`https://www.insaathesapp.com/p/${project.public_code}`}
                                                size={120}
                                            />
                                            <div style={{ wordBreak: 'break-all', textAlign: 'center' }}>
                                                <a
                                                    href={`https://www.insaathesapp.com/p/${project.public_code}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ fontSize: '8px', color: 'var(--color-primary)', textDecoration: 'underline' }}
                                                >
                                                    insaathesapp.com/p/{project.public_code}
                                                </a>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Firma Bilgileri (Merkezi) */}
                        {activeTab === 'apartments' && (
                            <div style={{ padding: 'var(--spacing-sm)', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24', marginTop: 'var(--spacing-sm)' }}>
                                <div
                                    onClick={() => setShowCompanySection(!showCompanySection)}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        marginBottom: showCompanySection ? '10px' : '0'
                                    }}
                                >
                                    <h3 style={{ fontSize: '11px', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        🏢 Firma Bilgileri
                                    </h3>
                                    <span style={{ fontSize: '10px', transition: 'transform 0.2s', transform: showCompanySection ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                                        {showCompanySection ? '▼' : '◀'}
                                    </span>
                                </div>

                                {showCompanySection && (
                                    <div style={{ padding: '8px 0', borderTop: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'grid', gap: '8px' }}>
                                            <div>
                                                <label style={{ fontSize: '9px', fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: '4px' }}>Firma Adı:</label>
                                                <input
                                                    type="text"
                                                    value={companyInfo.company_name}
                                                    onChange={(e) => setCompanyInfo({ ...companyInfo, company_name: e.target.value })}
                                                    placeholder="Firma Adı"
                                                    style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '9px', fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: '4px' }}>Adres:</label>
                                                <input
                                                    type="text"
                                                    value={companyInfo.company_address}
                                                    onChange={(e) => setCompanyInfo({ ...companyInfo, company_address: e.target.value })}
                                                    placeholder="Adres"
                                                    style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '9px', fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: '4px' }}>Konum (Link):</label>
                                                <input
                                                    type="text"
                                                    value={companyInfo.company_location}
                                                    onChange={(e) => setCompanyInfo({ ...companyInfo, company_location: e.target.value })}
                                                    placeholder="Google Haritalar Linki"
                                                    style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '9px', fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: '4px' }}>WhatsApp (905...):</label>
                                                <input
                                                    type="text"
                                                    value={companyInfo.whatsapp_number}
                                                    onChange={(e) => setCompanyInfo({ ...companyInfo, whatsapp_number: e.target.value })}
                                                    placeholder="905xxxxxxxxx"
                                                    style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                                                />
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <label style={{ fontSize: '9px', fontWeight: 700, color: '#dc2626' }}>BİLDİRİM E-POSTALARI (MAKS 3):</label>
                                                    {companyInfo.notification_emails.length < 3 && (
                                                        <button
                                                            onClick={() => setCompanyInfo({ ...companyInfo, notification_emails: [...companyInfo.notification_emails, ''] })}
                                                            style={{ padding: '2px 6px', fontSize: '9px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                        >
                                                            + Ekle
                                                        </button>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {companyInfo.notification_emails.map((email, index) => (
                                                        <div key={index} style={{ display: 'flex', gap: '4px' }}>
                                                            <input
                                                                type="email"
                                                                value={email}
                                                                onChange={(e) => {
                                                                    const newEmails = [...companyInfo.notification_emails];
                                                                    newEmails[index] = e.target.value;
                                                                    setCompanyInfo({ ...companyInfo, notification_emails: newEmails });
                                                                }}
                                                                placeholder={`E-posta ${index + 1}`}
                                                                style={{ flex: 1, padding: '6px', fontSize: '11px', border: '1px solid #fca5a5', borderRadius: '4px' }}
                                                            />
                                                            <button
                                                                onClick={() => setCompanyInfo({ ...companyInfo, notification_emails: companyInfo.notification_emails.filter((_, i) => i !== index) })}
                                                                style={{ padding: '0 8px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer' }}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {companyInfo.notification_emails.length === 0 && (
                                                        <div style={{ fontSize: '9px', color: '#64748b', fontStyle: 'italic' }}>E-posta eklenmedi.</div>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (!id || !project) return;
                                                    setSaving(true);
                                                    try {
                                                        const updates = {
                                                            company_name: companyInfo.company_name,
                                                            company_address: companyInfo.company_address,
                                                            company_location: companyInfo.company_location,
                                                            whatsapp_number: companyInfo.whatsapp_number,
                                                            notification_emails: companyInfo.notification_emails.filter(e => e && e.includes('@') && e.trim() !== '')
                                                        };
                                                        await projectService.updateProject(project.id, updates);
                                                        alert('Firma bilgileri kaydedildi!');
                                                        loadAllData(false);
                                                    } catch (err: any) {
                                                        console.error('❌ Kaydetme Hatası Detayı:', err);
                                                        alert('Hata: ' + (err instanceof Error ? err.message : 'Bir sorun oluştu.'));
                                                    } finally {
                                                        setSaving(false);
                                                    }
                                                }}
                                                disabled={saving}
                                                style={{
                                                    marginTop: '4px',
                                                    padding: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    background: 'var(--color-primary)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: saving ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {saving ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}
                                            </button>

                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* Modals */}
            <ExpenseModal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} onSave={handleSaveExpense} project={project} editingExpenseId={editingExpenseId} expenseDate={expenseDate} setExpenseDate={setExpenseDate} selectedPartner={selectedPartner} setSelectedPartner={setSelectedPartner} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} recipient={recipient} setRecipient={setRecipient} category={category} setCategory={setCategory} description={description} setDescription={setDescription} amount={amount} setAmount={setAmount} saving={saving} errorMsg={errorMsg} />
            <CheckModal isOpen={showCheckModal} onClose={() => setShowCheckModal(false)} onSave={handleSaveCheck} editingCheckId={editingCheckId} checkFormData={checkFormData} setCheckFormData={setCheckFormData} saving={saving} errorMsg={errorMsg} projects={project ? [project] : []} />
            <ApartmentModal isOpen={showApartmentModal} onClose={() => setShowApartmentModal(false)} id={id || ''} project={project} editingApartmentId={editingApartmentId} apartmentFormData={apartmentFormData} setApartmentFormData={setApartmentFormData} setEditingApartmentId={setEditingApartmentId} setApartments={setApartments} formatCurrency={formatCurrency} />
            <BulkModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} id={id || ''} project={project} apartments={apartments} bulkFormData={bulkFormData} setBulkFormData={setBulkFormData} setLoading={setLoading} loadAllData={() => loadAllData(false)} />

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--spacing-md)' }}>
                    <div className="card" style={{ maxWidth: '400px', width: '100%', padding: 'var(--spacing-lg)' }}>
                        <h2 className="mb-md">
                            {actionType === 'expense' ? 'Gideri Sil' : actionType === 'check' ? 'Çeki Sil' : 'Satışı İptal Et'}
                        </h2>
                        <p className="mb-lg" style={{ color: 'var(--color-text-light)', fontSize: '13px' }}>
                            <strong>{deletingExpense?.name}</strong> işlemini onaylamak için e-posta adresinize (ctinferdi@gmail.com) gönderilen 4 haneli kodu girin.
                        </p>
                        <div className="form-group">
                            <label className="form-label" style={{ color: 'var(--color-primary)', fontWeight: 800 }}>KOD E-POSTA ADRESİNİZE GÖNDERİLDİ</label>
                            <input
                                type="tel"
                                className="form-input"
                                value={deleteConfirmCode}
                                onChange={(e) => setDeleteConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="4 haneli kodu girin"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoFocus
                                style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 800 }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                            <button onClick={handleDeleteConfirm} className="btn btn-primary" style={{ flex: 1, backgroundColor: '#f5576c' }}>ONAYLA</button>
                            <button className="btn btn-secondary" onClick={() => { setShowDeleteModal(false); setDeleteConfirmCode(''); setDeletingExpense(null); }} style={{ flex: 1 }}>İPTAL</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default ProjectDetail;
