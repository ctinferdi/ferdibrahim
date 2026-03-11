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
    const [aiLoading, setAiLoading] = React.useState(false);
    const [aiNote, setAiNote] = React.useState<string | null>(null);
    const [retryCountdown, setRetryCountdown] = React.useState(0);
    const retryTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    const startRetryCountdown = (seconds = 60) => {
        setRetryCountdown(seconds);
        if (retryTimerRef.current) clearInterval(retryTimerRef.current);
        retryTimerRef.current = setInterval(() => {
            setRetryCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(retryTimerRef.current!);
                    setAiNote('Kota sıfırlandı. Tekrar deneyebilirsiniz.');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    React.useEffect(() => () => { if (retryTimerRef.current) clearInterval(retryTimerRef.current); }, []);

    const handleAiAnalyze = async () => {
        setAiLoading(true);
        setAiNote(null);

        // Yüklü cephe resmi varsa Gemini ile analiz et
        const firstImage = projectImages?.[0]?.url;
        if (firstImage) {
            try {
                const res = await fetch(
                    'https://bqwqwgcrnrtunwzyajzf.supabase.co/functions/v1/analyze-building-image',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageUrl: firstImage }),
                    }
                );
                const data = await res.json();
                if (data.error) throw new Error(data.error);

                setBulkFormData({
                    startFloor:   data.startFloor   ?? bulkFormData.startFloor,
                    endFloor:     data.endFloor     ?? bulkFormData.endFloor,
                    basementApts: data.basementApts ?? bulkFormData.basementApts,
                    groundApts:   data.groundApts   ?? bulkFormData.groundApts,
                    normalApts:   data.normalApts   ?? bulkFormData.normalApts,
                    hasDuplex:    data.hasDuplex    ?? bulkFormData.hasDuplex,
                    duplexCount:  data.duplexCount  ?? bulkFormData.duplexCount,
                });
                const conf = Math.round((data.confidence ?? 0) * 100);
                setAiNote(`Yapay zeka analiz etti (güven: %${conf})${data.notes ? ` — ${data.notes}` : ''}`);
            } catch (e: any) {
                setAiNote(`Görsel analiz hatası: ${e.message}`);
            } finally {
                setAiLoading(false);
            }
            return;
        }

        // Resim yoksa mevcut daire verisinden analiz et
        setTimeout(() => {
            try {
                if (apartments.length === 0) {
                    setAiNote('Cephe resmi veya daire verisi bulunamadı. Önce resim yükleyin.');
                    setAiLoading(false);
                    return;
                }

                const floors = apartments.map((a: any) => a.floor ?? 0);
                const minFloor = Math.min(...floors);
                const maxFloor = Math.max(...floors);

                const basementFloors = [...new Set(apartments.filter((a: any) => a.floor < 0).map((a: any) => a.floor))];
                const normalFloors   = [...new Set(apartments.filter((a: any) => a.floor > 0 && a.floor < maxFloor).map((a: any) => a.floor))];
                const topFloorApts   = apartments.filter((a: any) => a.floor === maxFloor);

                const basementAptPerFloor = basementFloors.length > 0
                    ? Math.round(apartments.filter((a: any) => a.floor < 0).length / basementFloors.length)
                    : 1;
                const groundApts = apartments.filter((a: any) => a.floor === 0).length || 1;
                const normalAptPerFloor = normalFloors.length > 0
                    ? Math.round(apartments.filter((a: any) => a.floor > 0 && a.floor < maxFloor).length / normalFloors.length)
                    : 4;

                const hasDuplex = topFloorApts.some((a: any) =>
                    (a.apartment_number?.toUpperCase().includes('DUBLE') || a.apartment_number?.toUpperCase().includes('DBX')) ||
                    a.square_meters >= 200
                );

                setBulkFormData({
                    startFloor: minFloor,
                    endFloor: maxFloor,
                    basementApts: basementAptPerFloor,
                    groundApts,
                    normalApts: normalAptPerFloor,
                    hasDuplex,
                    duplexCount: topFloorApts.length || 2,
                });

                setAiNote(`Mevcut veriden analiz: ${maxFloor - minFloor + 1} kat, ${apartments.length} daire${hasDuplex ? ', üst kat dubleks' : ''}.`);
            } catch (e: any) {
                setAiNote(`Hata: ${e.message}`);
            } finally {
                setAiLoading(false);
            }
        }, 600);
    };
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

                {/* AI Analiz Butonu */}
                <div style={{ marginBottom: 'var(--spacing-md)', background: '#f0f4ff', borderRadius: 8, padding: '10px 12px', border: '1px solid #c7d2fe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {/* PDF + Resim yükleme (çoklu, karma) */}
                        <label style={{
                            background: '#fff',
                            border: '1.5px dashed #818cf8',
                            borderRadius: 6,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#4f46e5',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}>
                            📎 Plan / Resim Yükle
                            <input
                                type="file"
                                accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                                multiple
                                style={{ display: 'none' }}
                                onChange={async (e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length === 0) return;
                                    setAiLoading(true);
                                    setAiNote(`${files.length} dosya okunuyor...`);
                                    try {
                                        const readFile = (f: File) => new Promise<{data: string; mimeType: string}>((resolve, reject) => {
                                            const reader = new FileReader();
                                            reader.onload = () => resolve({
                                                data: (reader.result as string).split(',')[1],
                                                mimeType: f.type || 'application/octet-stream',
                                            });
                                            reader.onerror = reject;
                                            reader.readAsDataURL(f);
                                        });
                                        const filesArray = await Promise.all(files.map(readFile));
                                        const labels = files.map(f => f.name).join(', ');
                                        setAiNote(`Gemini AI analiz ediyor: ${labels}`);

                                        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                                        if (!apiKey) throw new Error('VITE_GEMINI_API_KEY .env dosyasında tanımlı değil');

                                        const prompt = `Bu ${filesArray.length > 1 ? `${filesArray.length} adet bina kat planı / cephe görseli` : 'bir bina kat planı veya cephe görseli'}. Tüm belgeleri birlikte dikkatlice analiz et.\n\nSADECE şu JSON formatında yanıt ver:\n{"buildingWidth":14.0,"buildingDepth":8.5,"startFloor":-1,"endFloor":6,"basementApts":1,"groundApts":1,"normalApts":4,"hasDuplex":true,"duplexCount":4,"confidence":0.90,"notes":"kısa açıklama"}`;

                                        const geminiRes = await fetch(
                                            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                                            {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    contents: [{
                                                        parts: [
                                                            { text: prompt },
                                                            ...filesArray.map(f => ({ inline_data: { mime_type: f.mimeType, data: f.data } }))
                                                        ]
                                                    }],
                                                    generationConfig: { maxOutputTokens: 400, temperature: 0.1 },
                                                }),
                                            }
                                        );

                                        if (!geminiRes.ok) {
                                            const errText = await geminiRes.text();
                                            if (geminiRes.status === 429) {
                                                setAiNote('Gemini API kotası doldu.');
                                                startRetryCountdown(60);
                                                return;
                                            }
                                            throw new Error(`Gemini ${geminiRes.status}: ${errText}`);
                                        }

                                        const geminiData = await geminiRes.json();
                                        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                                        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                                        if (!jsonMatch) throw new Error('AI yanıtı JSON içermiyor');

                                        const data = JSON.parse(jsonMatch[0]);
                                        setBulkFormData({
                                            startFloor:   data.startFloor   ?? bulkFormData.startFloor,
                                            endFloor:     data.endFloor     ?? bulkFormData.endFloor,
                                            basementApts: data.basementApts ?? bulkFormData.basementApts,
                                            groundApts:   data.groundApts   ?? bulkFormData.groundApts,
                                            normalApts:   data.normalApts   ?? bulkFormData.normalApts,
                                            hasDuplex:    data.hasDuplex    ?? bulkFormData.hasDuplex,
                                            duplexCount:  data.duplexCount  ?? bulkFormData.duplexCount,
                                        });
                                        if (data.buildingWidth && id) {
                                            localStorage.setItem(`building_dims_${id}`, JSON.stringify({ w: data.buildingWidth, d: data.buildingDepth }));
                                        }
                                        const conf = Math.round((data.confidence ?? 0) * 100);
                                        const dims = data.buildingWidth ? ` | Bina: ${data.buildingWidth}m × ${data.buildingDepth}m` : '';
                                        setAiNote(`${files.length} dosya analiz tamamlandı (güven: %${conf})${dims}${data.notes ? ` — ${data.notes}` : ''}`);
                                    } catch (err: any) {
                                        const msg = err.message || '';
                                        if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('429')) {
                                            setAiNote('Gemini API kotası doldu.');
                                            startRetryCountdown(60);
                                        } else {
                                            setAiNote(`Analiz hatası: ${msg}`);
                                        }
                                    } finally {
                                        setAiLoading(false);
                                        e.target.value = '';
                                    }
                                }}
                            />
                        </label>

                        <button
                            type="button"
                            onClick={handleAiAnalyze}
                            disabled={aiLoading}
                            style={{
                                background: aiLoading ? '#a5b4fc' : 'linear-gradient(135deg,#6366f1,#7c3aed)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '7px 14px',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: aiLoading ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {aiLoading ? '⏳ Analiz ediliyor...' : '🤖 AI ile Tespit Et'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (!id) { setAiNote('Hata: Proje ID bulunamadı'); return; }
                                setBulkFormData({ startFloor: -1, endFloor: 6, basementApts: 1, groundApts: 1, normalApts: 4, hasDuplex: true, duplexCount: 4 });
                                localStorage.setItem(`building_dims_${id}`, JSON.stringify({ w: 14.5, d: 9.0 }));
                                console.log('Demo: building_dims_' + id, { w: 14.5, d: 9.0 });
                                setAiNote(`✓ Demo yüklendi (14.5m × 9.0m). Şimdi public sayfada "3D Görünüm" butonuna bas.`);
                            }}
                            style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, padding: '7px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            🧪 Demo
                        </button>
                        <span style={{ fontSize: 11, color: '#6366f1', flexBasis: '100%', marginTop: 2 }}>
                            PDF veya JPG/PNG seç (Ctrl+tıkla ile çoklu) → Gemini hepsini birlikte analiz eder
                        </span>
                    </div>
                    {aiNote && (
                        <p style={{ margin: '8px 0 0', fontSize: 11, color: (aiNote.includes('hata') || aiNote.includes('Hata') || aiNote.includes('kotası') || aiNote.includes('doldu')) ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                            {aiNote}
                            {retryCountdown > 0 && (
                                <span style={{ marginLeft: 6, background: '#fef2f2', color: '#dc2626', borderRadius: 4, padding: '1px 6px', fontSize: 11 }}>
                                    {retryCountdown}s
                                </span>
                            )}
                        </p>
                    )}
                </div>

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
