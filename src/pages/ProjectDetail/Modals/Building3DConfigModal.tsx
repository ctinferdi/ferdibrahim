import React, { useState, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Building3D, { Building3DConfig } from '../../../components/Building3D';
import { Apartment } from '../../../types';

export type { Building3DConfig };

// PDF.js worker — CDN üzerinden yükle (no bundle size issue)
pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// ── PDF'den metin çıkar ve bina boyutlarını tahmin et ────────────────────────
async function extractDimsFromPdf(file: File): Promise<{
    buildingWidth: number; buildingDepth: number;
    floorCount: number; aptsPerFloor: number;
    hasBasement: boolean; hasBalcony: boolean;
    notes: string;
}> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let allText = '';
    for (let p = 1; p <= Math.min(pdf.numPages, 6); p++) {
        const page    = await pdf.getPage(p);
        const content = await page.getTextContent();
        const pageText = content.items
            .map((item: any) => item.str ?? '')
            .join(' ');
        allText += ' ' + pageText;
    }

    // ── Boyut sayılarını bul ─────────────────────────────────────────────
    // Türk mimarisinde boyutlar genellikle cm veya mm cinsinden yazar (2810, 28100)
    const numPattern = /\b(\d{2,6}(?:[.,]\d{1,3})?)\b/g;
    const nums: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = numPattern.exec(allText)) !== null) {
        const v = parseFloat(m[1].replace(',', '.'));
        if (!isNaN(v)) nums.push(v);
    }

    const toMetres = (v: number) => {
        if (v > 5000) return v / 1000;   // mm → m
        if (v > 100)  return v / 100;    // cm → m
        if (v > 20)   return v;          // zaten metre
        return null;
    };

    const dims = nums
        .map(toMetres)
        .filter((v): v is number => v !== null && v >= 3 && v <= 200)
        .sort((a, b) => b - a);

    const buildingWidth = dims[0] ?? 20;
    const buildingDepth = dims[1] ?? buildingWidth * 0.5;

    // ── Kat sayısı tespiti ──────────────────────────────────────────────
    const upper = allText.toUpperCase();
    const hasBasement = upper.includes('BODRUM') || upper.includes('B KAT') || upper.includes('B-1');
    const katMatches  = upper.match(/\b(\d{1,2})\.\s*KAT\b/g) ?? [];
    const katNums     = katMatches
        .map(s => parseInt(s))
        .filter(n => !isNaN(n) && n > 0);
    const floorCount  = katNums.length > 0 ? Math.max(...katNums) : Math.max(1, Math.round(dims.length / 4));
    const aptsPerFloor = Math.max(1, Math.round((dims.length > 10 ? dims.length / (floorCount + 1) : 4)));
    const hasBalcony   = upper.includes('BALKON') || upper.includes('TERAS') || upper.includes('KONSOL');

    return {
        buildingWidth: Math.min(200, Math.max(6, buildingWidth)),
        buildingDepth: Math.min(60,  Math.max(5, buildingDepth)),
        floorCount:    Math.min(30,  Math.max(1, floorCount)),
        aptsPerFloor:  Math.min(8,   Math.max(1, aptsPerFloor)),
        hasBasement, hasBalcony,
        notes: `PDF'den otomatik: ${allText.length} karakter okundu`,
    };
}


const DEFAULTS: Building3DConfig = {
    facadeHex:    0xdbd6c8,
    balconyDepth: 1.40,
    windowCount:  2,
    floorHeight:  1.35,
};

const FACADE_OPTIONS = [
    { label: 'Krem',   hex: 0xede8d8, css: '#ede8d8' },
    { label: 'Beyaz',  hex: 0xf5f5f0, css: '#f5f5f0' },
    { label: 'Gri',    hex: 0xd4d4d0, css: '#d4d4d0' },
    { label: 'Bej',    hex: 0xd4c4a8, css: '#d4c4a8' },
    { label: 'Kahve',  hex: 0xc0a880, css: '#c0a880' },
    { label: 'Mavi',   hex: 0xc8d8e8, css: '#c8d8e8' },
];

export function loadBuilding3DConfig(projectId: string): Building3DConfig {
    try {
        const raw = localStorage.getItem(`b3d_cfg_${projectId}`);
        return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch { return { ...DEFAULTS }; }
}

interface Props {
    projectId: string;
    onClose:   () => void;
    onApply:   (cfg: Building3DConfig) => void;
}

interface AiResult {
    buildingWidthM: number;
    buildingDepthM: number;
    floorCount:     number;
    aptsPerFloor:   number;
    hasBasement:    boolean;
    hasBalcony:     boolean;
    balconyDepth:   number;
    windowCount:    number;
    floorHeight:    number;
    roofType:       'flat' | 'pointed';
    facadeHex:      number;
    confidence:     number;
    notes:          string;
}

type Step = 'upload' | 'analyzing' | 'preview' | 'manual';

const FACADE_MAP: Record<string, number> = {
    krem: 0xede8d8, beyaz: 0xf5f5f0, gri: 0xd4d4d0, bej: 0xd4c4a8, kahve: 0xc0a880, mavi: 0xc8d8e8,
};

const toMetres = (v: number) => {
    if (v > 500)  return v / 1000;
    if (v > 50)   return v / 100;
    return v;
};

// En fazla 3 dosya gönder — PDF öncelikli, sonra PNG/JPG
const pickBestFiles = (files: File[]): File[] => {
    const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    const imgs = files.filter(f => !f.name.toLowerCase().endsWith('.pdf'));
    const selected = [...pdfs, ...imgs].slice(0, 3);
    return selected;
};

const Building3DConfigModal: React.FC<Props> = ({ projectId, onClose, onApply }) => {
    const [step,           setStep]           = useState<Step>('upload');
    const [files,          setFiles]          = useState<File[]>([]);
    const [aiResult,       setAiResult]       = useState<AiResult | null>(null);
    const [cfg,            setCfg]            = useState<Building3DConfig>({ ...DEFAULTS });
    const [aiError,        setAiError]        = useState('');
    const [showManual,     setShowManual]     = useState(false);
    const [manPreviewOn,   setManPreviewOn]   = useState(false);  // Manuel modda 3D sadece butona basınca açılır

    // Manuel giriş state
    const [manWidthM,   setManWidthM]   = useState(20);
    const [manDepthM,   setManDepthM]   = useState(10);
    const [manFloors,   setManFloors]   = useState(4);
    const [manApts,     setManApts]     = useState(4);
    const [manBasement, setManBasement] = useState(false);

    const activeResult: AiResult | null = step === 'manual' ? {
        buildingWidthM: manWidthM,
        buildingDepthM: manDepthM,
        floorCount:     manFloors,
        aptsPerFloor:   manApts,
        hasBasement:    manBasement,
        hasBalcony:     cfg.balconyDepth > 0,
        balconyDepth:   cfg.balconyDepth,
        windowCount:    cfg.windowCount,
        floorHeight:    cfg.floorHeight,
        roofType:       cfg.roofType ?? 'flat',
        facadeHex:      cfg.facadeHex,
        confidence:     1,
        notes:          '',
    } : aiResult;

    const sceneW = activeResult ? Math.max(8, activeResult.buildingWidthM / 1.61) : 12;
    const sceneD = activeResult ? Math.max(5, activeResult.buildingDepthM / 1.61) : 7;

    const mockApts: Apartment[] = useMemo(() => {
        if (!activeResult) return [];
        const result: Apartment[] = [];
        const startF = activeResult.hasBasement ? -1 : 0;
        for (let f = startF; f <= activeResult.floorCount; f++) {
            const count = f < 0 ? Math.max(1, Math.floor(activeResult.aptsPerFloor / 2)) : activeResult.aptsPerFloor;
            for (let u = 0; u < count; u++) {
                result.push({
                    id: `preview_${f}_${u}`,
                    project_id: projectId,
                    building_name: 'A',
                    apartment_number: `${f}${String(u + 1).padStart(2, '0')}`,
                    floor: f,
                    square_meters: 100,
                    price: 0,
                    status: 'common',
                    sort_order: u,
                });
            }
        }
        return result;
    }, [activeResult, projectId]);

    const analyzeFiles = async () => {
        if (!files.length) return;
        setStep('analyzing');
        setAiError('');

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

            // Seçilen tek PDF dosyası (varsa)
            const pdfFile = files.find(f => f.name.toLowerCase().endsWith('.pdf'));
            const singleFile = pdfFile ?? files[0];

            // ── ADIM 1: PDF metin çıkarma (kota yok, API key yok) ───────────
            let pdfDims: Awaited<ReturnType<typeof extractDimsFromPdf>> | null = null;
            if (pdfFile) {
                try {
                    pdfDims = await extractDimsFromPdf(pdfFile);
                } catch {
                    // PDF metin çıkarma başarısız → Gemini'ye geç
                }
            }

            // PDF'den yeterli veri çıkartıldıysa direkt kullan, Gemini'ye gerek yok
            if (pdfDims && pdfDims.buildingWidth >= 8) {
                const result: AiResult = {
                    buildingWidthM: pdfDims.buildingWidth,
                    buildingDepthM: pdfDims.buildingDepth,
                    floorCount:     pdfDims.floorCount,
                    aptsPerFloor:   pdfDims.aptsPerFloor,
                    hasBasement:    pdfDims.hasBasement,
                    hasBalcony:     pdfDims.hasBalcony,
                    balconyDepth:   pdfDims.hasBalcony ? 1.2 : 0,
                    windowCount:    2,
                    floorHeight:    1.35,
                    roofType:       'flat',
                    facadeHex:      0xede8d8,
                    confidence:     0.75,
                    notes:          pdfDims.notes,
                };
                setAiResult(result);
                setCfg({ facadeHex: result.facadeHex, balconyDepth: result.balconyDepth, windowCount: result.windowCount, floorHeight: result.floorHeight, roofType: result.roofType });
                setStep('preview');
                return;
            }

            // ── ADIM 2: Gemini ile analiz (PDF metin çıkarma başarısız/yetersizse) ──
            if (!apiKey) throw new Error('QUOTA'); // API key yoksa direkt manuel moda geç

            const readFile = (file: File): Promise<{ data: string; mimeType: string }> =>
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const b64  = (reader.result as string).split(',')[1];
                        const mime = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
                        resolve({ data: b64, mimeType: mime });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

            const fileData = await readFile(singleFile);

            const prompt = `Kat planı. Ölçü çizgilerini oku. SADECE JSON yaz:
{"buildingWidth":0,"buildingDepth":0,"floorCount":4,"aptsPerFloor":4,"hasBasement":false,"hasBalcony":true,"balconyDepth":1.2,"windowCount":2,"floorHeight":3.0,"roofType":"flat","facadeSuggestion":"krem","confidence":0.85,"notes":""}
buildingWidth=ön cephe metre, buildingDepth=derinlik metre, cm ise /100, mm ise /1000.`;

            const parts = [
                { text: prompt },
                { inline_data: { mime_type: fileData.mimeType, data: fileData.data } },
            ];

            const MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
            let lastErr = '';
            let rawText = '';

            for (const model of MODELS) {
                try {
                    const res = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts }],
                                generationConfig: { maxOutputTokens: 300, temperature: 0.1 },
                            }),
                        }
                    );
                    if (!res.ok) {
                        const errTxt = await res.text();
                        if (res.status === 429 || errTxt.includes('RESOURCE_EXHAUSTED')) { lastErr = 'QUOTA'; continue; }
                        throw new Error(`${model} hata: ${res.status}`);
                    }
                    const data = await res.json();
                    rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                    if (rawText) break;
                } catch (innerErr: any) {
                    if (innerErr.message === 'QUOTA' || (innerErr.message || '').includes('RESOURCE_EXHAUSTED')) { lastErr = 'QUOTA'; continue; }
                    throw innerErr;
                }
            }

            if (!rawText && lastErr === 'QUOTA') throw new Error('QUOTA');

            const match = rawText.match(/\{[\s\S]*\}/);
            if (!match) throw new Error('AI yanıtı geçersiz format döndürdü');

            const d = JSON.parse(match[0]);
            const wM = toMetres(d.buildingWidth ?? 20);
            const dM = toMetres(d.buildingDepth ?? wM * 0.5);

            const result: AiResult = {
                buildingWidthM: Math.max(8,  wM),
                buildingDepthM: Math.max(5,  dM),
                floorCount:     Math.max(1,  d.floorCount     ?? 4),
                aptsPerFloor:   Math.max(1,  d.aptsPerFloor   ?? 4),
                hasBasement:    d.hasBasement  ?? false,
                hasBalcony:     d.hasBalcony   ?? true,
                balconyDepth:   d.hasBalcony   ? Math.max(0.4, Math.min(2.0, d.balconyDepth ?? 1.2)) : 0,
                windowCount:    Math.max(1,  Math.min(4, d.windowCount ?? 2)),
                floorHeight:    Math.max(1.0, Math.min(1.8, (d.floorHeight ?? 3.0) / 1.61)),
                roofType:       d.roofType === 'pointed' ? 'pointed' : 'flat',
                facadeHex:      FACADE_MAP[d.facadeSuggestion ?? 'krem'] ?? 0xede8d8,
                confidence:     d.confidence ?? 0.7,
                notes:          d.notes ?? '',
            };

            setAiResult(result);
            setCfg({
                facadeHex:    result.facadeHex,
                balconyDepth: result.balconyDepth,
                windowCount:  result.windowCount,
                floorHeight:  result.floorHeight,
                roofType:     result.roofType,
            });
            setStep('preview');

        } catch (e: any) {
            const isQuota = e.message === 'QUOTA' || (e.message || '').includes('quota') || (e.message || '').includes('429');
            if (isQuota) {
                // Kota doldu → manuel girişe geç
                setAiError('');
                setStep('manual');
            } else {
                setAiError(e.message || 'Analiz başarısız');
                setStep('upload');
            }
        }
    };

    const handleApply = () => {
        if (!activeResult) return;
        const scW = Math.max(8, activeResult.buildingWidthM / 1.61);
        const scD = Math.max(5, activeResult.buildingDepthM / 1.61);
        localStorage.setItem(`building_dims_${projectId}`, JSON.stringify({ w: scW, d: scD }));
        localStorage.setItem(`b3d_cfg_${projectId}`, JSON.stringify(cfg));
        onApply(cfg);
        onClose();
    };

    const s = {
        overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
        box:     { background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 20, width: '100%', maxWidth: 980, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const, boxShadow: '0 40px 80px rgba(0,0,0,0.7)' },
        label:   { fontSize: 11, fontWeight: 700 as const, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 6, display: 'block' },
        card:    (active: boolean): React.CSSProperties => ({ border: `2px solid ${active ? '#3b82f6' : '#1e3a5f'}`, borderRadius: 10, padding: '8px 10px', cursor: 'pointer', background: active ? '#1e3a5f' : '#1e293b', color: active ? '#fff' : '#94a3b8', textAlign: 'center', fontSize: 11, fontWeight: active ? 700 : 400 }),
    };

    const showPreview = step === 'preview' || (step === 'manual' && manPreviewOn);

    return (
        <div style={s.overlay} onClick={onClose}>
            <div style={s.box} onClick={e => e.stopPropagation()}>

                {/* Başlık */}
                <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #1e3a5f', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div>
                        <div style={{ color: '#fff', fontSize: 17, fontWeight: 800 }}>
                            {step === 'manual' ? '✏️ Manuel Bina Girişi' : '🤖 AI ile 3D Bina Oluştur'}
                        </div>
                        <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
                            {step === 'manual'
                                ? 'Gemini kota doldu — boyutları kendin gir, 3D anında oluşur'
                                : 'PDF kat planlarını yükle → Gemini analiz eder → canlı 3D önizle'}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 22, cursor: 'pointer' }}>✕</button>
                </div>

                {/* Ana içerik */}
                <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px', display: 'flex', gap: 18 }}>

                    {/* Sol panel */}
                    <div style={{ width: 310, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

                        {/* ── UPLOAD ── */}
                        {step === 'upload' && (
                            <>
                                <div>
                                    <label style={s.label}>📁 Kat Planı Dosyaları (PDF / JPG / PNG)</label>
                                    <div style={{ color: '#475569', fontSize: 10, marginBottom: 6 }}>
                                        En fazla 3 dosya gönderilir (PDF öncelikli). Kota hatası alınca manuel giriş açılır.
                                    </div>
                                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px 14px', border: '2px dashed #1e3a5f', borderRadius: 14, cursor: 'pointer', background: '#0f172a', textAlign: 'center', minHeight: 90 }}>
                                        <span style={{ fontSize: 26 }}>📂</span>
                                        <span style={{ color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>
                                            {files.length > 0 ? `${files.length} dosya seçildi` : 'Dosya seç veya sürükle bırak'}
                                        </span>
                                        <span style={{ color: '#334155', fontSize: 10 }}>PDF, JPG, PNG — çoklu seçim (Ctrl+tıkla)</span>
                                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files || []))} />
                                    </label>
                                    {files.length > 0 && (
                                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 160, overflowY: 'auto' }}>
                                            {files.map((f, i) => {
                                                const isPicked = pickBestFiles(files).includes(f);
                                                return (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: isPicked ? '#0d2137' : '#131e2e', borderRadius: 7, padding: '4px 8px', fontSize: 10, border: isPicked ? '1px solid #1e4a6e' : '1px solid transparent' }}>
                                                        <span>{f.name.endsWith('.pdf') ? '📄' : '🖼️'}</span>
                                                        <span style={{ color: isPicked ? '#93c5fd' : '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                                        {isPicked && <span style={{ color: '#4ade80', fontSize: 9, fontWeight: 700 }}>✓ GÖNDERİLECEK</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {aiError && (
                                        <div style={{ marginTop: 8, padding: '8px 12px', background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 8, color: '#fca5a5', fontSize: 11 }}>
                                            ⚠️ {aiError}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                                    <button onClick={() => setStep('manual')} style={{ flex: 1, padding: '9px', borderRadius: 10, border: '1px solid #1e3a5f', background: 'transparent', color: '#60a5fa', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                                        ✏️ Manuel Gir
                                    </button>
                                    <button
                                        onClick={analyzeFiles}
                                        disabled={files.length === 0}
                                        style={{ flex: 2, padding: '9px', borderRadius: 10, border: 'none', background: files.length > 0 ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : '#1e293b', color: files.length > 0 ? '#fff' : '#475569', fontSize: 12, fontWeight: 700, cursor: files.length > 0 ? 'pointer' : 'not-allowed', boxShadow: files.length > 0 ? '0 4px 14px rgba(37,99,235,0.4)' : 'none' }}
                                    >
                                        🤖 AI ile Analiz Et
                                    </button>
                                </div>
                                <button onClick={() => { localStorage.setItem(`b3d_cfg_${projectId}`, JSON.stringify(cfg)); onApply(cfg); onClose(); }} style={{ width: '100%', padding: '7px', borderRadius: 8, border: '1px solid #1e293b', background: 'transparent', color: '#334155', fontSize: 10, cursor: 'pointer' }}>
                                    Mevcut ayarları kaydet (AI olmadan)
                                </button>
                            </>
                        )}

                        {/* ── ANALYZING ── */}
                        {step === 'analyzing' && (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div style={{ fontSize: 40, marginBottom: 14 }}>🤖</div>
                                <div style={{ color: '#60a5fa', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Gemini analiz ediyor...</div>
                                <div style={{ color: '#475569', fontSize: 11, lineHeight: 1.6 }}>
                                    {pickBestFiles(files).length} dosya gönderildi<br />Ölçüler, pencereler, balkonlar okunuyor
                                </div>
                                <div style={{ marginTop: 16, display: 'flex', gap: 5, justifyContent: 'center' }}>
                                    {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', opacity: 0.4 + i * 0.3 }} />)}
                                </div>
                            </div>
                        )}

                        {/* ── MANUEL GİRİŞ ── */}
                        {step === 'manual' && (
                            <>
                                <div style={{ padding: '10px 12px', background: '#0d2137', border: '1px solid #1e4a6e', borderRadius: 10, fontSize: 11, color: '#93c5fd', lineHeight: 1.6 }}>
                                    ℹ️ Gemini kota doldu. Bina boyutlarını kendin gir — 3D önizleme sağ tarafta canlı güncellenecek.
                                </div>

                                {/* Genişlik */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                        <span style={s.label}>Bina Genişliği (ön cephe)</span>
                                        <span style={{ color: '#60a5fa', fontWeight: 800, fontSize: 14 }}>{manWidthM} m</span>
                                    </div>
                                    <input type="range" min="6" max="60" step="1" value={manWidthM} onChange={e => { setManWidthM(+e.target.value); setManPreviewOn(false); }} style={{ width: '100%', accentColor: '#3b82f6', height: 5 }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', fontSize: 10 }}><span>6m</span><span>60m</span></div>
                                </div>

                                {/* Derinlik */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                        <span style={s.label}>Bina Derinliği</span>
                                        <span style={{ color: '#a78bfa', fontWeight: 800, fontSize: 14 }}>{manDepthM} m</span>
                                    </div>
                                    <input type="range" min="5" max="30" step="1" value={manDepthM} onChange={e => { setManDepthM(+e.target.value); setManPreviewOn(false); }} style={{ width: '100%', accentColor: '#8b5cf6', height: 5 }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', fontSize: 10 }}><span>5m</span><span>30m</span></div>
                                </div>

                                {/* Kat Sayısı */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                        <span style={s.label}>Kat Sayısı</span>
                                        <span style={{ color: '#4ade80', fontWeight: 800, fontSize: 14 }}>{manFloors} kat</span>
                                    </div>
                                    <input type="range" min="1" max="20" step="1" value={manFloors} onChange={e => { setManFloors(+e.target.value); setManPreviewOn(false); }} style={{ width: '100%', accentColor: '#22c55e', height: 5 }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', fontSize: 10 }}><span>1</span><span>20</span></div>
                                </div>

                                {/* Daire/Kat */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                        <span style={s.label}>Daire / Kat</span>
                                        <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: 14 }}>{manApts}</span>
                                    </div>
                                    <input type="range" min="1" max="8" step="1" value={manApts} onChange={e => { setManApts(+e.target.value); setManPreviewOn(false); }} style={{ width: '100%', accentColor: '#f59e0b', height: 5 }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', fontSize: 10 }}><span>1</span><span>8</span></div>
                                </div>

                                {/* Bodrum */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <button onClick={() => { setManBasement(v => !v); setManPreviewOn(false); }} style={{ width: 36, height: 20, borderRadius: 10, border: 'none', background: manBasement ? '#3b82f6' : '#1e293b', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                                        <div style={{ position: 'absolute', top: 2, left: manBasement ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
                                    </button>
                                    <span style={{ color: '#94a3b8', fontSize: 11 }}>Bodrum kat var</span>
                                </div>

                                {/* 3D Önizle butonu */}
                                <button
                                    onClick={() => setManPreviewOn(true)}
                                    style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}
                                >
                                    🔄 3D Önizle
                                </button>

                                <button onClick={() => { setStep('upload'); setAiError(''); setManPreviewOn(false); }} style={{ width: '100%', padding: '7px', borderRadius: 8, border: '1px solid #1e3a5f', background: 'transparent', color: '#60a5fa', fontSize: 11, cursor: 'pointer' }}>
                                    ↩ Tekrar PDF dene
                                </button>
                            </>
                        )}

                        {/* ── PREVIEW (AI sonucu) ── */}
                        {step === 'preview' && aiResult && (
                            <>
                                <div style={{ background: '#0d2137', border: '1px solid #1e4a6e', borderRadius: 12, padding: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ color: '#60a5fa', fontSize: 12, fontWeight: 800 }}>🤖 AI Analiz Sonucu</span>
                                        <span style={{ color: aiResult.confidence > 0.7 ? '#4ade80' : '#fbbf24', fontSize: 11, fontWeight: 700 }}>
                                            %{Math.round(aiResult.confidence * 100)} güven
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                        {[
                                            { label: 'Genişlik', value: `${aiResult.buildingWidthM.toFixed(1)} m` },
                                            { label: 'Derinlik', value: `${aiResult.buildingDepthM.toFixed(1)} m` },
                                            { label: 'Kat sayısı', value: `${aiResult.floorCount}` },
                                            { label: 'Daire/Kat', value: `${aiResult.aptsPerFloor}` },
                                            { label: 'Balkon', value: aiResult.hasBalcony ? `${aiResult.balconyDepth.toFixed(1)} m` : 'Yok' },
                                            { label: 'Pencere', value: `${aiResult.windowCount} adet` },
                                        ].map(item => (
                                            <div key={item.label} style={{ background: '#0a1628', borderRadius: 7, padding: '5px 8px' }}>
                                                <div style={{ color: '#334155', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
                                                <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {aiResult.notes && <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 10, fontStyle: 'italic' }}>ℹ️ {aiResult.notes}</div>}
                                </div>

                                <button onClick={() => setShowManual(v => !v)} style={{ width: '100%', padding: '7px', borderRadius: 10, border: '1px solid #1e3a5f', background: 'transparent', color: '#60a5fa', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                                    {showManual ? '▲ İnce Ayarı Kapat' : '⚙️ İnce Ayar (renk, balkon, pencere)'}
                                </button>

                                <button onClick={() => { setStep('upload'); setAiResult(null); setFiles([]); }} style={{ width: '100%', padding: '7px', borderRadius: 8, border: '1px solid #1e293b', background: 'transparent', color: '#334155', fontSize: 10, cursor: 'pointer' }}>
                                    ↩ Farklı Plan Yükle
                                </button>
                            </>
                        )}

                        {/* ── İNCE AYAR (preview + manual için) ── */}
                        {(showPreview && (showManual || step === 'manual')) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px', background: '#0f172a', borderRadius: 12, border: '1px solid #1e293b' }}>
                                {/* Cephe Rengi */}
                                <div>
                                    <span style={s.label}>Cephe Rengi</span>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
                                        {FACADE_OPTIONS.map(o => (
                                            <div key={o.label} onClick={() => setCfg(c => ({ ...c, facadeHex: o.hex }))} style={{ ...s.card(cfg.facadeHex === o.hex), padding: '5px 2px' }}>
                                                <div style={{ width: 20, height: 20, borderRadius: 5, background: o.css, margin: '0 auto 2px', border: cfg.facadeHex === o.hex ? '2px solid #3b82f6' : '1px solid #334155' }} />
                                                <div style={{ fontSize: 8 }}>{o.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Balkon */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={s.label}>Balkon Derinliği</span>
                                        <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: 12 }}>{cfg.balconyDepth.toFixed(1)} m</span>
                                    </div>
                                    <input type="range" min="0" max="2" step="0.1" value={cfg.balconyDepth} onChange={e => setCfg(c => ({ ...c, balconyDepth: +e.target.value }))} style={{ width: '100%', accentColor: '#f59e0b', height: 4 }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', fontSize: 9, marginTop: 1 }}><span>Yok</span><span>2m</span></div>
                                </div>

                                {/* Pencere */}
                                <div>
                                    <span style={s.label}>Pencere / Daire</span>
                                    <div style={{ display: 'flex', gap: 5 }}>
                                        {[1, 2, 3, 4].map(n => (
                                            <button key={n} onClick={() => setCfg(c => ({ ...c, windowCount: n }))} style={{ flex: 1, padding: '6px 2px', borderRadius: 7, border: `2px solid ${cfg.windowCount === n ? '#3b82f6' : '#1e3a5f'}`, background: cfg.windowCount === n ? '#1e3a5f' : 'transparent', color: cfg.windowCount === n ? '#fff' : '#475569', cursor: 'pointer', fontSize: 12, fontWeight: cfg.windowCount === n ? 700 : 400 }}>
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Kat yüksekliği */}
                                <div>
                                    <span style={s.label}>Kat Yüksekliği</span>
                                    <div style={{ display: 'flex', gap: 5 }}>
                                        {[{ l: 'Alçak', v: 1.10 }, { l: 'Normal', v: 1.35 }, { l: 'Yüksek', v: 1.65 }].map(o => (
                                            <button key={o.l} onClick={() => setCfg(c => ({ ...c, floorHeight: o.v }))} style={{ flex: 1, padding: '6px 2px', borderRadius: 7, border: `2px solid ${cfg.floorHeight === o.v ? '#3b82f6' : '#1e3a5f'}`, background: cfg.floorHeight === o.v ? '#1e3a5f' : 'transparent', color: cfg.floorHeight === o.v ? '#fff' : '#475569', cursor: 'pointer', fontSize: 10, fontWeight: cfg.floorHeight === o.v ? 700 : 400 }}>
                                                {o.l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Uygula butonu */}
                        {showPreview && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                                <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
                                    İptal
                                </button>
                                <button onClick={handleApply} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.4)' }}>
                                    ✅ 3D'yi Uygula & Kaydet
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Sağ: 3D Önizleme */}
                    <div style={{ flex: 1, background: '#080f1c', borderRadius: 16, border: '1px solid #1e293b', overflow: 'hidden', minHeight: 380, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {showPreview && mockApts.length > 0 ? (
                            <Building3D
                                key={`${sceneW.toFixed(1)}-${sceneD.toFixed(1)}-${JSON.stringify(cfg)}-${step === 'manual' ? `${manFloors}-${manApts}-${manBasement}` : ''}`}
                                apartments={mockApts}
                                buildingWidth={sceneW}
                                buildingDepth={sceneD}
                                projectName="Önizleme"
                                config={cfg}
                            />
                        ) : (
                            <div style={{ textAlign: 'center', color: '#1e3a5f' }}>
                                <div style={{ fontSize: 60, marginBottom: 14, opacity: 0.3 }}>🏢</div>
                                <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
                                    {step === 'analyzing' ? '🤖 Gemini analiz ediyor...' : 'PDF planını yükle → AI 3D oluşturur'}
                                </div>
                                <div style={{ fontSize: 10, color: '#1e3a5f', marginTop: 6 }}>
                                    veya ✏️ Manuel Gir butonuna bas
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Building3DConfigModal;
