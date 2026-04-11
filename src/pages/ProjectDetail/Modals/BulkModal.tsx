import React from 'react';
import { apartmentService } from '../../../services/apartmentService';

interface BulkModalProps {
    isOpen: boolean;
    onClose: () => void;
    id: string;
    project: any;
    apartments: any[];
    bulkFormData: any;
    setBulkFormData: (data: any) => void;
    setLoading: (loading: boolean) => void;
    loadAllData: () => Promise<void>;
    projectImages?: { url: string }[];
}

const BulkModal: React.FC<BulkModalProps> = ({
    isOpen, onClose, id, project, apartments,
    bulkFormData, setBulkFormData,
    setLoading, loadAllData,
    projectImages = [],
}) => {

    // Kat planı modalı her açıldığında mevcut daireleri analiz edip sayıları günceller
    React.useEffect(() => {
        if (isOpen && apartments.length > 0) {
            const floors = apartments.map(a => a.floor);
            const minFloor = Math.min(...floors);
            const maxFloor = Math.max(...floors);

            // Kat bazlı (kat başına düşen) daire sayılarını hesapla
            const normalFloors = [...new Set(apartments.filter(a => a.floor > 0 && a.floor < maxFloor).map(a => a.floor))];
            const basementFloors = [...new Set(apartments.filter(a => a.floor < 0).map(a => a.floor))];

            const basementAptPerFloor = basementFloors.length > 0
                ? Math.round(apartments.filter(a => a.floor < 0).length / basementFloors.length)
                : 2;

            const groundApts = apartments.filter(a => a.floor === 0).length;

            const normalAptPerFloor = normalFloors.length > 0
                ? Math.round(apartments.filter(a => a.floor > 0 && a.floor < maxFloor).length / normalFloors.length)
                : 4;

            // En üst kat dubleks kontrolü
            const topFloorApts = apartments.filter(a => a.floor === maxFloor);
            const hasDuplex = topFloorApts.some(a =>
                (a.apartment_number && (a.apartment_number.includes('(DBX)') || a.apartment_number.includes('DUBLEKS'))) ||
                a.square_meters === 200
            );

            setBulkFormData({
                startFloor: minFloor,
                endFloor: maxFloor,
                basementApts: basementAptPerFloor,
                groundApts: groundApts || 2,
                normalApts: normalAptPerFloor,
                hasDuplex: hasDuplex,
                duplexCount: topFloorApts.length || 2
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBulkSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        try {
            setLoading(true);

            const toDelete: string[] = [];
            const newApartments: any[] = [];

            for (let f = bulkFormData.startFloor; f <= bulkFormData.endFloor; f++) {
                const allInFloor = apartments.filter(a => a.floor === f);

                let targetCount = bulkFormData.normalApts;
                if (f < 0) targetCount = bulkFormData.basementApts;
                else if (f === 0) targetCount = bulkFormData.groundApts;
                else if (f === bulkFormData.endFloor && bulkFormData.hasDuplex) targetCount = bulkFormData.duplexCount;

                const diff = allInFloor.length - targetCount;

                if (diff > 0) {
                    // Fazla daire var — sadece available olanları sil (sort_order'a göre sondan)
                    const available = [...allInFloor]
                        .filter(a => a.status === 'available')
                        .sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0));
                    toDelete.push(...available.slice(0, diff).map(a => a.id));
                } else if (diff < 0) {
                    // Eksik daire var — ekle
                    const existingSortOrders = allInFloor.map(a => a.sort_order || 0);
                    let nextSortOrder = existingSortOrders.length > 0 ? Math.max(...existingSortOrders) + 1 : 1;

                    for (let d = 0; d < Math.abs(diff); d++) {
                        const isDuplex = f === bulkFormData.endFloor && bulkFormData.hasDuplex;
                        newApartments.push({
                            building_name: project?.name || 'Bina',
                            apartment_number: isDuplex ? `${f} (DUBLEKS)` : '',
                            floor: f,
                            square_meters: isDuplex ? 200 : 100,
                            price: 0,
                            status: 'available',
                            sort_order: nextSortOrder,
                            project_id: id || ''
                        });
                        nextSortOrder++;
                    }
                }
                // diff === 0: bu kat zaten doğru sayıda, hiçbir şey yapma
            }

            if (toDelete.length > 0) {
                await apartmentService.bulkDeleteApartments(toDelete);
            }
            if (newApartments.length > 0) {
                await apartmentService.bulkAddApartments(newApartments, project?.user_id || '');
            }

            await loadAllData();
            setLoading(false);
            await new Promise(resolve => setTimeout(resolve, 500));
            onClose();
        } catch (error: any) {
            console.error('BulkModal hata:', error);
            setLoading(false);
            alert(`Bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
        }
    };

    return (
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
                <form onSubmit={handleBulkSubmit}>
                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                                    En Alt Kat (Bodrum: -1)
                                </label>
                                <input
                                    type="number"
                                    value={bulkFormData.startFloor}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setBulkFormData({ ...bulkFormData, startFloor: isNaN(val) ? -1 : val });
                                    }}
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
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setBulkFormData({ ...bulkFormData, endFloor: isNaN(val) ? 1 : val });
                                    }}
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
                                    value={bulkFormData.basementApts}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setBulkFormData({ ...bulkFormData, basementApts: isNaN(val) ? 0 : val });
                                    }}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                                    Zeminde Kaç?
                                </label>
                                <input
                                    type="number"
                                    value={bulkFormData.groundApts}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setBulkFormData({ ...bulkFormData, groundApts: isNaN(val) ? 0 : val });
                                    }}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                                    Ara Katta Kaç?
                                </label>
                                <input
                                    type="number"
                                    value={bulkFormData.normalApts}
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? '' : parseInt(e.target.value);
                                        setBulkFormData({ ...bulkFormData, normalApts: val === '' ? 1 : (isNaN(val) ? 1 : val) });
                                    }}
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
                                        value={bulkFormData.duplexCount}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setBulkFormData({ ...bulkFormData, duplexCount: isNaN(val) ? 1 : val });
                                        }}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                            >
                                Planı {apartments.length > 0 ? 'Güncelle' : 'Oluştur'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onClose}
                                style={{ flex: 1 }}
                            >
                                İptal
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulkModal;
