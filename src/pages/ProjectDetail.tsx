import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { projectService } from '../services/projectService';
import { storageService } from '../services/storageService';
import { expenseService } from '../services/expenseService';
import { checkService } from '../services/checkService';
import { apartmentService } from '../services/apartmentService';
import { Project, Expense, Check, Apartment } from '../types';
import { supabase } from '../config/supabase';

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
import Building3DConfigModal, { Building3DConfig } from './ProjectDetail/Modals/Building3DConfigModal';
import FloorPlanEditor from '../components/FloorPlanEditor';

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
    const [show3DConfig,  setShow3DConfig]  = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showFloorEditor, setShowFloorEditor] = useState(false);
    const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

    const Building3D = React.lazy(() => import('../components/Building3D'));

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
        notification_phone: '',
        notification_phone_2: '',
        notification_phone_3: '',
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
        installments: [] as any[],
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
        // Sadece satılan (sold) daireleri göster. Mal sahibi (owner) veya ortak (common) alanlar tabloda gözükmesin.
        if (a.status !== 'sold') return false;

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
    const [showImagesSection, setShowImagesSection] = useState(false);
    const [projectImages, setProjectImages] = useState<any[]>([]);
    const [imageUploading, setImageUploading] = useState(false);

    // Load project images separately (not in polling loop)
    useEffect(() => {
        if (!project?.id) return;
        projectService.getProjectImages(project.id)
            .then(imgs => setProjectImages(imgs))
            .catch(e => console.warn('Project images load failed:', e));
    }, [project?.id]);

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

        // Phase 1: Preparation & Fast-path
        // Only show main spinner if we don't have project data yet
        if (showSpinner) setLoading(true);

        try {
            // Shortcut: If ID is a UUID, we can fetch everything in parallel immediately.
            // Shortcut 2: If we have the UUID cached from a previous visit, use it.
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            let targetUUID = isUUID ? id : null;

            if (!targetUUID) {
                const cached = localStorage.getItem(`project_uuid_${id}`);
                if (cached) targetUUID = cached;
            }

            // Phase 2: Parallel Fetching
            const fetchPromises: Promise<any>[] = [
                projectService.getProjectBySlug(id)
            ];

            // If we have a UUID (direct or cached), trigger child fetches immediately
            if (targetUUID) {
                fetchPromises.push(expenseService.getExpenses(targetUUID));
                fetchPromises.push(checkService.getChecks(targetUUID));
                fetchPromises.push(apartmentService.getApartments(targetUUID));
            }

            if (showSpinner) {
                setLoadingExpenses(true);
                setLoadingChecks(true);
                setLoadingApartments(true);
            }

            const results = await Promise.all(fetchPromises);
            const proj = results[0] as Project;

            if (!proj) throw new Error('Proje bulunamadı');

            // --- YETKİ KONTROLÜ ---
            const isSuper = isUserSuperAdmin(user?.email);
            if (!isSuper) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('accessible_projects')
                    .eq('id', user?.id)
                    .single();
                
                const accessibleIds = profile?.accessible_projects || [];
                if (!accessibleIds.includes(proj.id)) {
                    throw new Error('Bu projeyi görüntüleme yetkiniz yok.');
                }
            }
            // ----------------------

            // --- ORPHANED DATA RECOVERY ---
            // If the PC had a stale targetUUID from a deleted project, it was fetching 155 orphaned items.
            // We need to link those orphaned items to the new project so they appear on all devices.
            if (targetUUID && targetUUID !== proj.id) {
                try {
                    const { data: oldProj, error: oldError } = await supabase
                        .from('projects')
                        .select('id')
                        .eq('id', targetUUID)
                        .maybeSingle();

                    if (!oldProj && !oldError) {
                        // The old project was deleted! Recover orphaned data to the new project.
                        console.log('Recovering orphaned data from', targetUUID, 'to', proj.id);
                        await Promise.all([
                            supabase.from('expenses').update({ project_id: proj.id }).eq('project_id', targetUUID),
                            supabase.from('checks').update({ project_id: proj.id }).eq('project_id', targetUUID),
                            supabase.from('apartments').update({ project_id: proj.id }).eq('project_id', targetUUID)
                        ]);
                    }
                } catch (e) {
                    console.warn('Orphan check failed', e);
                }
                
                // Fix the stale cache
                localStorage.setItem(`project_uuid_${id}`, proj.id);
                
                // Force results length to 1 so it fetches fresh data for proj.id
                results.length = 1;
            } else if (proj.slug) {
                // Store ID-Slug mapping for future fast-paths
                localStorage.setItem(`project_uuid_${proj.slug}`, proj.id);
            }

            setProject(prev => JSON.stringify(prev) !== JSON.stringify(proj) ? proj : prev);

            // Phase 3: Handle individual results
            if (results.length === 1) {
                const realProjectId = proj.id;

                // Fetch others in parallel now
                const [exps, chks, apts] = await Promise.all([
                    expenseService.getExpenses(realProjectId),
                    checkService.getChecks(realProjectId),
                    apartmentService.getApartments(realProjectId)
                ]);

                setExpenses(prev => JSON.stringify(prev) !== JSON.stringify(exps) ? exps : prev);
                setChecks(prev => JSON.stringify(prev) !== JSON.stringify(chks) ? chks : prev);
                setApartments(prev => JSON.stringify(prev) !== JSON.stringify(apts) ? apts : prev);
            } else {
                // We fetched everything in the first Promise.all
                const [_, exps, chks, apts] = results;
                setExpenses(prev => JSON.stringify(prev) !== JSON.stringify(exps) ? exps : prev);
                setChecks(prev => JSON.stringify(prev) !== JSON.stringify(chks) ? chks : prev);
                setApartments(prev => JSON.stringify(prev) !== JSON.stringify(apts) ? apts : prev);
            }

            // Sync company info
            const newCompanyInfo = {
                company_name: proj.company_name || '',
                company_address: proj.company_address || '',
                company_location: proj.company_location || '',
                whatsapp_number: proj.whatsapp_number || '',
                notification_emails: proj.notification_emails || []
            };

            if (!showCompanySection) {
                setCompanyInfo(prev => JSON.stringify(prev) !== JSON.stringify(newCompanyInfo) ? newCompanyInfo : prev);
            }

            if (proj.partners && proj.partners.length > 0 && !selectedPartner) {
                setSelectedPartner(proj.partners[0].id);
            }

            // Final: Unblock all UI states
            setLoading(false);
            setLoadingExpenses(false);
            setLoadingChecks(false);
            setLoadingApartments(false);

            // Auto-redirect to slug if accessing via ID
            if (proj.slug && id !== proj.slug && isUUID) {
                // Use current window search to avoid searchParams dependency loop
                const currentSearch = window.location.search;
                navigate(`/projeler/${proj.slug}${currentSearch}`, { replace: true });
            }

        } catch (err) {
            console.error(err);
            if (showSpinner) navigate('/projeler');
            setLoading(false);
            setLoadingExpenses(false);
            setLoadingChecks(false);
            setLoadingApartments(false);
        }
    }, [id, navigate, selectedPartner, showCompanySection]);

    // Cache Saving Logic
    useEffect(() => {
        if (project && id) {
            const cacheData = {
                project,
                expenses,
                checks,
                apartments,
                timestamp: Date.now()
            };
            localStorage.setItem(`project_cache_${id}`, JSON.stringify(cacheData));
        }
    }, [project, expenses, checks, apartments, id]);

    // Initial Load & Refresh Logic
    useEffect(() => {
        const handleRefresh = () => {
            if (id) {
                loadAllData(false);
            }
        };

        window.addEventListener('system-refresh', handleRefresh);

        if (id) {
            // Try loading from cache first
            const cached = localStorage.getItem(`project_cache_${id}`);
            let hasCache = false;

            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    // 1 hour cache validity or similar? For now, always show cache first for speed.
                    setProject(data.project);
                    setExpenses(data.expenses || []);
                    setChecks(data.checks || []);
                    setApartments(data.apartments || []);

                    if (data.project) {
                        setLoading(false);
                        hasCache = true;
                    }
                } catch (e) {
                    console.error('Cache parse error', e);
                }
            }

            // Fetch fresh data (show spinner only if no cache)
            loadAllData(!hasCache);
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
        return expenses
            .filter(e => e.partner_id === partnerId)
            .reduce((sum, e) => sum + (e.amount || 0), 0);
    };

    const resetExpenseForm = () => {
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setSelectedPartner(project?.partners && project.partners.length > 0 ? project.partners[0].id : '');
        setPaymentMethod('');
        setRecipient('');
        setCategory('');
        setDescription('');
        setAmount('');
        setEditingExpenseId(null);
        setErrorMsg(null);
    };

    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving || !project?.id) return;
        setSaving(true);
        try {
            const data = {
                date: expenseDate,
                category,
                description,
                amount: Number(amount.replace(/\./g, '')),
                project_id: project.id,
                partner_id: selectedPartner || undefined,
                payment_method: paymentMethod,
                recipient
            };

            if (editingExpenseId) {
                await expenseService.updateExpense(editingExpenseId, data);
            } else {
                if (!user?.id) throw new Error('Oturum bilgisi bulunamadı');
                await expenseService.addExpense(data, user.id);
            }
            setShowExpenseModal(false);
            resetExpenseForm();
            // Optimistic update: manually update the local state if needed
            // But since we use subscribeToExpenses, it might refresh anyway.
            // Let's call loadAllData(false) as it was, but without blocking the modal close.
            loadAllData(false);
        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setSaving(false);
        }
    };

    const resetCheckForm = () => {
        setCheckFormData({
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
            notification_phone: '',
            notification_phone_2: '',
            notification_phone_3: '',
            project_id: id || ''
        });
        setEditingCheckId(null);
        setErrorMsg(null);
    };

    const handleSaveCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        const projectId = project?.id;
        if (saving || !projectId) return;
        setSaving(true);
        try {
            if (editingCheckId) {
                await checkService.updateCheck(editingCheckId, { ...checkFormData, project_id: projectId });
            } else {
                if (!user?.id) throw new Error('Oturum bulunamadı');
                await checkService.addCheck({ ...checkFormData, project_id: projectId }, user.id);
            }
            setShowCheckModal(false);
            resetCheckForm();
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
                loadAllData(false);
            } catch (err) { console.error(err); }
        } else {
            alert('Girdiğiniz kod hatalı. Lütfen mailinizi kontrol edin.');
        }
    };

    if (loading || !project) {
        return <Layout><div className="loading-container"><div className="spinner"></div></div></Layout>;
    }
    
    const generalTotal = activeTab === 'expenses'
        ? filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
        : activeTab === 'checks'
            ? filteredChecks.reduce((sum, c) => sum + (c.amount || 0), 0)
            : 0;

    const filteredAptStats = filteredApartments.reduce((stats, apt) => {
        stats.totalSoldPrice += (apt.sold_price || 0);
        stats.totalPaidAmount += (apt.paid_amount || 0);
        return stats;
    }, { totalSoldPrice: 0, totalPaidAmount: 0 });

    const aptStats = apartments.reduce((stats, apt) => {
        stats.total++;
        if (apt.status === 'sold') {
            stats.soldCount++;
            // stats.totalSoldPrice ve stats.totalPaidAmount artık genel state'den değil, 
            // arama durumuna göre (filteredAptStats) SummaryCards'a gidecek.
        } else if (apt.status === 'owner') {
            stats.ownerCount++;
        }
        return stats;
    }, { total: 0, soldCount: 0, ownerCount: 0 });

    const summaryAptStats = {
        ...aptStats,
        totalSoldPrice: searchTerm ? filteredAptStats.totalSoldPrice : apartments.reduce((s, a) => s + (a.sold_price || 0), 0),
        totalPaidAmount: searchTerm ? filteredAptStats.totalPaidAmount : apartments.reduce((s, a) => s + (a.paid_amount || 0), 0),
    };

    const checkStats = filteredChecks.reduce((stats, check) => {
        if (check.status === 'paid') {
            stats.paidTotal += check.amount;
        } else {
            stats.pendingTotal += check.amount;
        }
        return stats;
    }, { paidTotal: 0, pendingTotal: 0 });

    const exportToExcel = () => {
        let data = [];
        let filename = "";
        if (activeTab === 'expenses') {
            data = filteredExpenses.map(e => ({
                'Tarih': new Date(e.date).toLocaleDateString('tr-TR'),
                'Kim İçin': project?.partners?.find(p => p.id === e.partner_id)?.name || '',
                'Ödeme Şekli': e.payment_method || '-',
                'Verilen Kişi': e.recipient || '-',
                'İş Adı': e.category || '-',
                'Açıklama': e.description || '-',
                'Tutar': formatCurrency(e.amount)
            }));
            filename = "giderler.csv";
        } else if (activeTab === 'checks') {
            data = filteredChecks.map(c => ({
                'Çek No': c.check_number,
                'Tutar': formatCurrency(c.amount),
                'Firma': c.company,
                'Kategori': c.category,
                'Keşideci': c.issuer,
                'Veriliş Tarihi': new Date(c.given_date).toLocaleDateString('tr-TR'),
                'Vade Tarihi': new Date(c.due_date).toLocaleDateString('tr-TR'),
                'Durum': c.status === 'paid' ? 'Ödendi' : 'Bekliyor',
                'Açıklama': c.description || '-'
            }));
            filename = "cekler.csv";
        } else {
            data = filteredApartments.map(a => ({
                'Blok/Bina': a.building_name || '-',
                'Daire No': a.apartment_number,
                'Durum': a.status === 'sold' ? 'Satıldı' : (a.status === 'owner' ? 'M.Sahibi' : 'Müsait'),
                'Müşteri': a.customer_name || '-',
                'Telefon': a.customer_phone || '-',
                'Liste Fiyatı': formatCurrency(a.price),
                'Satış Fiyatı': formatCurrency(a.sold_price || 0),
                'Alınan Ödeme': formatCurrency(a.paid_amount || 0),
                'Kalan Alacak': formatCurrency((a.sold_price || 0) - (a.paid_amount || 0))
            }));
            filename = "daireler.csv";
        }

        if (data.length === 0) {
            alert('İndirilecek veri bulunamadı.');
            return;
        }

        const headers = Object.keys(data[0]);
        
        // Profesyonel Excel Görünümü için HTML Table yapısı (Zengin Format)
        let tableHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>${activeTab === 'expenses' ? 'Giderler' : activeTab === 'checks' ? 'Çekler' : 'Daireler'}</x:Name>
                                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    table { border-collapse: collapse; }
                    th { background-color: #15803d; color: white; font-weight: bold; border: 1pt solid #166534; text-align: left; }
                    td { border: 1pt solid #e2e8f0; }
                </style>
            </head>
            <body>
                <table border="1">
                    <thead>
                        <tr>
                            ${headers.map(h => `<th style="padding: 10px; font-size: 11px;">${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                ${headers.map(h => `<td style="padding: 5px; font-size: 11px;">${(row as any)[h]}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;
        
        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${project?.name || 'proje'}_${filename.replace('.csv', '.xls')}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (

        <Layout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>


                {/* Second Row - Actions & Summaries */}
                <div className="project-toolbar" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
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
                            if (activeTab === 'expenses') {
                                resetExpenseForm();
                                setShowExpenseModal(true);
                            }
                            else if (activeTab === 'checks') {
                                resetCheckForm();
                                setShowCheckModal(true);
                            }
                            else { setEditingApartmentId(null); setApartmentFormData({ ...apartmentFormData, status: 'sold' }); setShowApartmentModal(true); }
                        }} style={{ height: '40px', padding: '0 1.2rem', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                            + {activeTab === 'expenses' ? 'Gider Ekle' : activeTab === 'checks' ? 'Çek Ekle' : 'Daire Satışı'}
                        </button>
                        |
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
                                <button className="btn btn-secondary" onClick={() => setShowFloorEditor(true)} style={{ height: '40px', padding: '0 1rem', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', background: '#0f172a', borderColor: '#334155', color: '#94a3b8' }}>
                                    📐 Kat Planı Çiz
                                </button>


                            </>
                        )}
                    </div>

                    {/* Right Side: Summaries */}
                    <SummaryCards
                        activeTab={activeTab}
                        generalTotal={generalTotal}
                        project={project}
                        getPartnerTotal={getPartnerTotal}
                        aptStats={summaryAptStats}
                        checkStats={checkStats}
                        formatCurrency={formatCurrency}
                        onExport={exportToExcel}
                    />

                </div>


                {/* Main Content Area */}
                <div className="project-detail-main" style={{
                    padding: 'var(--spacing-md)',
                    display: 'flex',
                    gap: 'var(--spacing-lg)',
                    minHeight: '500px'
                }}>

                    {/* Left Column - Main Table */}
                    <div className="table-column" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'auto' }}>
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
                                notification_phone: c.notification_phone || '',
                                notification_phone_2: c.notification_phone_2 || '',
                                notification_phone_3: c.notification_phone_3 || '',
                                project_id: c.project_id || id || ''
                            });
                            setShowCheckModal(true);
                        }} onDelete={handleDeleteClick} sendingCode={sendingCode} />}
                        {activeTab === 'apartments' && <ApartmentTable apartments={filteredApartments} formatCurrency={formatCurrency} loading={loadingApartments} onEdit={(a) => { setEditingApartmentId(a.id); setApartmentFormData({ ...a, sold_price: a.sold_price || 0, paid_amount: a.paid_amount || 0, customer_name: a.customer_name || '', customer_phone: a.customer_phone || '', sort_order: a.sort_order || 0, plan_files: a.plan_files || [], installments: a.installments || [], project_id: a.project_id || id || '' }); setShowApartmentModal(true); }} onReset={handleApartmentResetClick} sendingCode={sendingCode} />}
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
                            
                            {/* View Toggle */}
                            <div style={{ display: 'flex', gap: '2px', background: '#f1f5f9', padding: '2px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                <button 
                                    onClick={() => setViewMode('2d')}
                                    style={{ padding: '3px 10px', fontSize: '10px', fontWeight: 700, border: 'none', borderRadius: '4px', cursor: 'pointer', background: viewMode === '2d' ? 'white' : 'transparent', boxShadow: viewMode === '2d' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: viewMode === '2d' ? 'var(--color-primary)' : '#64748b' }}
                                >2D</button>
                                <button 
                                    onClick={() => setViewMode('3d')}
                                    style={{ padding: '3px 10px', fontSize: '10px', fontWeight: 700, border: 'none', borderRadius: '4px', cursor: 'pointer', background: viewMode === '3d' ? 'white' : 'transparent', boxShadow: viewMode === '3d' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: viewMode === '3d' ? 'var(--color-primary)' : '#64748b' }}
                                >3D</button>
                            </div>
                        </div>

                        {viewMode === '2d' ? (
                            <FloorPlan apartments={apartments} onApartmentClick={(a) => {
                                setEditingApartmentId(a.id);
                                setApartmentFormData({ ...a, sold_price: a.sold_price || 0, paid_amount: a.paid_amount || 0, customer_name: a.customer_name || '', customer_phone: a.customer_phone || '', sort_order: a.sort_order || 0, plan_files: a.plan_files || [], installments: a.installments || [], project_id: a.project_id || id || '' });
                                setShowApartmentModal(true);
                            }} />
                        ) : (
                            <div style={{ height: '500px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <React.Suspense fallback={<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#64748b', letterSpacing: '1px' }}>3D YÜKLENİYOR...</div>}>
                                    <Building3D 
                                        apartments={apartments}
                                        projectName={project.name}
                                        onSelectApartment={(a) => {
                                            setEditingApartmentId(a.id);
                                            setApartmentFormData({ ...a, sold_price: a.sold_price || 0, paid_amount: a.paid_amount || 0, customer_name: a.customer_name || '', customer_phone: a.customer_phone || '', sort_order: a.sort_order || 0, plan_files: a.plan_files || [], installments: a.installments || [], project_id: a.project_id || id || '' });
                                            setShowApartmentModal(true);
                                        }}
                                    />
                                </React.Suspense>
                            </div>
                        )}

                        {/* Bina Resimleri Section */}
                        {activeTab === 'apartments' && (
                            <div style={{ padding: 'var(--spacing-sm)', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: 'var(--spacing-md)' }}>
                                <div onClick={() => setShowImagesSection(!showImagesSection)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: showImagesSection ? '8px' : '0' }}>
                                    <h3 style={{ fontSize: '11px', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        🖼️ Bina Resimleri ({projectImages.length})
                                    </h3>
                                    <span style={{ fontSize: '10px' }}>{showImagesSection ? '▼' : '◀'}</span>
                                </div>
                                {showImagesSection && (
                                    <>
                                        <p style={{ fontSize: '9px', color: 'var(--color-text-light)', margin: '0 0 8px' }}>
                                            Cephe ve proje resimleri — müşteriler public sayfada görecek
                                        </p>
                                        <label style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            padding: '8px', border: '1.5px dashed #cbd5e1', borderRadius: '8px',
                                            cursor: imageUploading ? 'not-allowed' : 'pointer',
                                            color: '#64748b', fontSize: '11px', marginBottom: '10px',
                                            background: '#fff'
                                        }}>
                                            {imageUploading ? '⏳ Yükleniyor...' : '📷 Resim Ekle (JPG, PNG)'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                style={{ display: 'none' }}
                                                disabled={imageUploading}
                                                onChange={async (e) => {
                                                    const files = Array.from(e.target.files || []);
                                                    if (!files.length || !project) return;
                                                    setImageUploading(true);
                                                    try {
                                                        for (const file of files) {
                                                            const { url, path } = await storageService.uploadProjectImage(file, project.id);
                                                            const img = await projectService.addProjectImage({ project_id: project.id, url, storage_path: path, name: file.name });
                                                            setProjectImages(prev => [...prev, img]);
                                                        }
                                                    } catch (err) {
                                                        console.error('Image upload failed:', err);
                                                    } finally {
                                                        setImageUploading(false);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </label>
                                        {projectImages.length > 0 && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '6px' }}>
                                                {projectImages.map(img => (
                                                    <div key={img.id} style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', aspectRatio: '1', background: '#e2e8f0' }}>
                                                        <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                                        <button
                                                            onClick={async () => {
                                                                if (!window.confirm('Bu resmi sil?')) return;
                                                                await projectService.deleteProjectImage(img.id);
                                                                if (img.storage_path) await storageService.deleteProjectImageFromStorage(img.storage_path);
                                                                setProjectImages(prev => prev.filter(i => i.id !== img.id));
                                                            }}
                                                            style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239,68,68,0.85)', border: 'none', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                                        >×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

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
                                        {(() => {
                                            const cleanSlug = project.slug ? project.slug.replace(/-/g, '') : '';
                                            const publicPath = `${cleanSlug ? cleanSlug + 'proje/p/' : 'p/'}${project.public_code}`;
                                            const fullUrl = `https://www.insaathesapp.com/${publicPath}`;
                                            const storedDims = (() => { try { return JSON.parse(localStorage.getItem(`building_dims_${project.id}`) || '{}'); } catch { return {}; } })();
                                            const dimParam = (storedDims.w && storedDims.w >= 8) ? `&bw=${storedDims.w}&bd=${storedDims.d}` : '';
                                            const url3d = `${fullUrl}?view=3d${dimParam}`;
                                            return (
                                                <>
                                                    <div style={{ fontSize: '9px', color: 'var(--color-text-light)', marginBottom: '6px', wordBreak: 'break-all', background: '#f1f5f9', borderRadius: '4px', padding: '4px 6px' }}>
                                                        {publicPath}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                                        <a
                                                            href={fullUrl}
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
                                                                link.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(fullUrl)}`;
                                                                link.click();
                                                            }}
                                                            className="btn"
                                                            style={{ fontSize: '9px', padding: '0.3rem 0.6rem', background: '#10b981', color: 'white', flex: 1 }}
                                                        >
                                                            💾 İndir
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.download = `${project.name}-3d-qr.png`;
                                                                link.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url3d)}`;
                                                                link.click();
                                                            }}
                                                            className="btn"
                                                            style={{ fontSize: '9px', padding: '0.3rem 0.6rem', background: '#6366f1', color: 'white', flex: 1 }}
                                                        >
                                                            📦 3D QR
                                                        </button>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ fontSize: '9px', color: '#475569', fontWeight: 700, letterSpacing: 0.5 }}>2D KAREKOD</div>
                                                        <QRCode value={fullUrl} size={120} />
                                                        <div style={{ fontSize: '9px', color: '#6366f1', fontWeight: 700, letterSpacing: 0.5, marginTop: '4px' }}>3D KAREKOD</div>
                                                        <QRCode value={url3d} size={120} />
                                                    </div>
                                                </>
                                            );
                                        })()}
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
                                                                    newEmails[index] = e.target.value.toLowerCase();
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
            <ApartmentModal isOpen={showApartmentModal} onClose={() => setShowApartmentModal(false)} id={project?.id || id || ''} project={project} editingApartmentId={editingApartmentId} apartmentFormData={apartmentFormData} setApartmentFormData={setApartmentFormData} setEditingApartmentId={setEditingApartmentId} setApartments={setApartments} formatCurrency={formatCurrency} />
            <BulkModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} id={project?.id || id || ''} project={project} apartments={apartments} bulkFormData={bulkFormData} setBulkFormData={setBulkFormData} setLoading={setLoading} loadAllData={() => loadAllData(false)} projectImages={projectImages} />
            <FloorPlanEditor isOpen={showFloorEditor} onClose={() => setShowFloorEditor(false)} projectName={project?.name} />
            {show3DConfig && project && (
                <Building3DConfigModal
                    projectId={project.id}
                    onClose={() => setShow3DConfig(false)}
                    onApply={(_cfg: Building3DConfig) => setShow3DConfig(false)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--spacing-md)' }}>
                    <div className="card" style={{ maxWidth: '400px', width: '100%', padding: 'var(--spacing-lg)' }}>
                        <h2 className="mb-md">
                            {actionType === 'expense' ? 'Gideri Sil' : actionType === 'check' ? 'Çeki Sil' : 'Satışı İptal Et'}
                        </h2>
                        <p className="mb-lg" style={{ color: 'var(--color-text-light)', fontSize: '13px' }}>
                            <strong>{deletingExpense?.name}</strong> işlemini onaylamak için e-posta adresinize ({user?.email}) gönderilen 4 haneli kodu girin.
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
