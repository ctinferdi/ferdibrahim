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
}

const BulkModal: React.FC<BulkModalProps> = ({
    isOpen, onClose, id, project, apartments,
    bulkFormData, setBulkFormData,
    setLoading, loadAllData
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
            const hasDuplex = topFloorApts.some(a => a.apartment_number.includes('(DBX)'));

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

    const handleBulkSubmit = async () => {
        try {
            const isUpdate = apartments.length > 0;
            const confirmMessage = isUpdate
                ? 'DİKKAT! Kat planını güncellerseniz, mevcut "Müsait" durumundaki TÜM daireler silinecek ve yeni plan oluşturulacak. Satılmış ve Mal Sahibi daireler korunacak. Devam edilsin mi?'
                : 'Bu işlem seçilen ayarlara göre yeni daireler oluşturacaktır. Devam edilsin mi?';

            if (!confirm(confirmMessage)) return;

            setLoading(true);

            if (isUpdate) {
                const availableIds = apartments.filter(a => a.status === 'available').map(a => a.id);
                if (availableIds.length > 0) {
                    await apartmentService.bulkDeleteApartments(availableIds);
                }
            }

            const newApartments: any[] = [];

            for (let f = bulkFormData.startFloor; f <= bulkFormData.endFloor; f++) {
                // Bu kattaki mevcut (silinmeyen) daireleri bul (Satıldı, Mal Sahibi, Ortak)
                const existingInFloor = apartments.filter(a => a.floor === f && a.status !== 'available');

                let targetCount = bulkFormData.normalApts;
                if (f < 0) targetCount = bulkFormData.basementApts;
                else if (f === 0) targetCount = bulkFormData.groundApts;
                else if (f === bulkFormData.endFloor && bulkFormData.hasDuplex) targetCount = bulkFormData.duplexCount;

                // Eğer mevcut daire sayısı hedef sayıdan azsa, aradaki fark kadar yeni daire ekle
                const countToAdd = targetCount - existingInFloor.length;

                if (countToAdd > 0) {
                    // Mevcut numaraları al ki çakışmasın
                    const existingNumbers = existingInFloor.map(a => {
                        const num = parseInt(a.apartment_number);
                        return isNaN(num) ? 0 : num;
                    });
                    let nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
                    // Sıralama için son sıra numarasını bul (yoksa 0)
                    const existingSortOrders = existingInFloor.map(a => a.sort_order || 0);
                    let nextSortOrder = existingSortOrders.length > 0 ? Math.max(...existingSortOrders) + 1 : 1;

                    for (let d = 0; d < countToAdd; d++) {
                        const isDuplex = f === bulkFormData.endFloor && bulkFormData.hasDuplex;
                        newApartments.push({
                            building_name: project?.name || 'Bina',
                            apartment_number: `${nextNum}${isDuplex ? ' (DBX)' : ''}`,
                            floor: f,
                            square_meters: isDuplex ? 200 : 100,
                            price: 0,
                            status: 'available',
                            sort_order: nextSortOrder, // Sabit sıra numarası
                            project_id: id || ''
                        });
                        nextNum++;
                        nextSortOrder++;
                    }
                }
            }

            if (newApartments.length > 0) {
                await apartmentService.bulkAddApartments(newApartments, project?.user_id || '');
            }

            // Refresh all data (summary cards + tables)
            await loadAllData();

            setLoading(false);
            alert(isUpdate ? 'Kat planı başarıyla güncellendi!' : 'Kat planı başarıyla oluşturuldu!');
            onClose();
        } catch (error: any) {
            console.error('Toplu oluşturma hatası:', error);
            setLoading(false);
            alert('Bir hata oluştu!');
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
                        onClick={handleBulkSubmit}
                    >
                        Planı {apartments.length > 0 ? 'Güncelle' : 'Oluştur'}
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        style={{ flex: 1 }}
                    >
                        İptal
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkModal;
