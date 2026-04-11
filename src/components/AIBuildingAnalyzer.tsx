import React, { useState, useRef } from 'react';
// @ts-ignore
import DxfParser from 'dxf-parser';

export interface BuildingAnalysisResult {
    floors: number;
    basementFloors: number;
    hasGroundShop: boolean;
    hasDuplex: boolean;
    buildingWidth: number;
    buildingDepth: number;
    wallColor: string;
    bandColor: string;
    roofColor: string;
    brickAccent: boolean;
    balconyStyle: 'standard' | 'wide' | 'narrow';
    windowRows: number;
    buildingName?: string;
    confidence: number;
}

interface AIBuildingAnalyzerProps {
    projectName?: string;
    onAnalysisComplete: (result: BuildingAnalysisResult) => void;
    currentAnalysis?: BuildingAnalysisResult | null;
}

interface UploadedFile {
    name: string;
    previewUrl: string;
    base64: string;
    mimeType: string;
    isDxf?: boolean;
    dxfText?: string;
}

interface DxfSummary {
    widthM: number;
    depthM: number;
    layers: string[];
    entityCount: number;
    minX: number; minY: number; maxX: number; maxY: number;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// DXF dosyasını parse edip özet çıkar
function parseDxf(text: string): DxfSummary | null {
    try {
        const parser = new DxfParser();
        const dxf = parser.parseSync(text);
        if (!dxf || !dxf.entities) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let entityCount = 0;

        const processVertex = (x: number, y: number) => {
            if (isNaN(x) || isNaN(y)) return;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        };

        for (const ent of dxf.entities) {
            entityCount++;
            if (ent.type === 'LINE') {
                processVertex(ent.vertices?.[0]?.x, ent.vertices?.[0]?.y);
                processVertex(ent.vertices?.[1]?.x, ent.vertices?.[1]?.y);
            } else if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
                for (const v of (ent.vertices || [])) processVertex(v.x, v.y);
            } else if (ent.type === 'CIRCLE' || ent.type === 'ARC') {
                processVertex(ent.center?.x, ent.center?.y);
            } else if (ent.type === 'INSERT') {
                processVertex(ent.position?.x, ent.position?.y);
            }
        }

        if (!isFinite(minX)) return null;

        const rawW = maxX - minX;
        const rawD = maxY - minY;

        // Otomatik birim tespiti: çok büyükse mm, orta ise cm, küçükse m
        const toMetres = (v: number) => {
            if (v > 5000) return v / 1000;   // mm → m
            if (v > 500)  return v / 100;    // cm → m
            if (v > 100)  return v / 10;     // dm → m
            return v;                         // zaten m
        };

        const layers = dxf.tables?.layer?.layers
            ? Object.keys(dxf.tables.layer.layers)
            : [];

        return {
            widthM: Math.round(toMetres(rawW) * 100) / 100,
            depthM: Math.round(toMetres(rawD) * 100) / 100,
            layers,
            entityCount,
            minX, minY, maxX, maxY,
        };
    } catch (e) {
        console.error('DXF parse hatası:', e);
        return null;
    }
}

const AIBuildingAnalyzer: React.FC<AIBuildingAnalyzerProps> = ({
    projectName,
    onAnalysisComplete,
    currentAnalysis
}) => {
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [analysisResult, setAnalysisResult] = useState<BuildingAnalysisResult | null>(currentAnalysis || null);
    const [showPanel, setShowPanel] = useState(false);
    const [dxfSummary, setDxfSummary] = useState<DxfSummary | null>(null);
    const [manualMode, setManualMode] = useState(false);
    const [manualResult, setManualResult] = useState<BuildingAnalysisResult>({
        floors: 5, basementFloors: 1, hasGroundShop: false, hasDuplex: false,
        buildingWidth: 15, buildingDepth: 10, wallColor: '#f5f6f8',
        bandColor: '#1e3a5f', roofColor: '#0d1f35', brickAccent: false,
        balconyStyle: 'standard', windowRows: 2, confidence: 90,
    });
    const fileRef = useRef<HTMLInputElement>(null);

    const fileToBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const readAsText = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(file, 'utf-8');
        });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const newFiles: UploadedFile[] = [];

        for (const file of files) {
            const isDxf = file.name.toLowerCase().endsWith('.dxf');
            const isPdf = file.type === 'application/pdf';
            const isImage = validImageTypes.includes(file.type);

            if (!isDxf && !isPdf && !isImage) {
                setError(`"${file.name}" desteklenmiyor. DXF, PDF veya görsel yükleyin.`);
                continue;
            }

            if (isDxf) {
                const dxfText = await readAsText(file);
                const summary = parseDxf(dxfText);
                setDxfSummary(summary);

                // Manuel formu DXF boyutlarıyla doldur
                if (summary) {
                    setManualResult(prev => ({
                        ...prev,
                        buildingWidth: Math.max(5, Math.min(50, summary.widthM)),
                        buildingDepth: Math.max(5, Math.min(30, summary.depthM)),
                    }));
                    setManualMode(true);
                }

                newFiles.push({
                    name: file.name,
                    previewUrl: '',
                    base64: btoa(unescape(encodeURIComponent(dxfText.slice(0, 50000)))),
                    mimeType: 'text/plain',
                    isDxf: true,
                    dxfText,
                });
            } else if (isPdf) {
                const base64 = await fileToBase64(file);
                newFiles.push({ name: file.name, previewUrl: '', base64, mimeType: file.type });
            } else {
                const base64 = await fileToBase64(file);
                const previewUrl = URL.createObjectURL(file);
                newFiles.push({ name: file.name, previewUrl, base64, mimeType: file.type });
            }
        }

        setUploadedFiles(prev => [...prev, ...newFiles].slice(0, 5));
        setError(null);
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const analyzeWithGemini = async () => {
        if (!uploadedFiles.length) {
            setError('Lütfen en az bir dosya yükleyin.');
            return;
        }
        setAnalyzing(true);
        setError(null);

        // DXF varsa text olarak gönder
        const dxfFile = uploadedFiles.find(f => f.isDxf);
        const imageFiles = uploadedFiles.filter(f => !f.isDxf);

        let prompt = '';
        const parts: any[] = [];

        if (dxfFile && dxfSummary) {
            // DXF layer isimlerinden kat bilgisi çıkarmaya çalış
            const layerHints = dxfSummary.layers
                .filter(l => /kat|floor|bodrum|basement|zemin|ground|roof|çatı|daire|apt/i.test(l))
                .slice(0, 30)
                .join(', ');

            prompt = `Bu bir AutoCAD DXF dosyasından çıkarılmış bina projesi özeti:

BINA BOYUTLARI (otomatik hesaplanan):
- Genişlik (cephe): ${dxfSummary.widthM} metre
- Derinlik: ${dxfSummary.depthM} metre
- Toplam çizim entity sayısı: ${dxfSummary.entityCount}
- Katman (layer) isimleri: ${dxfSummary.layers.slice(0, 50).join(', ')}
${layerHints ? `- Kat ile ilgili katmanlar: ${layerHints}` : ''}
${projectName ? `- Proje adı: ${projectName}` : ''}

Bu bilgilere dayanarak bina hakkında aşağıdaki JSON formatında tahminde bulun. Sadece JSON döndür:
{
  "floors": <zemin hariç normal kat sayısı, genellikle 3-8>,
  "basementFloors": <bodrum kat sayısı>,
  "hasGroundShop": <zemin katta dükkan var mı, true/false>,
  "hasDuplex": <dubleks kat var mı, true/false>,
  "buildingWidth": ${dxfSummary.widthM},
  "buildingDepth": ${dxfSummary.depthM},
  "wallColor": "#f5f6f8",
  "bandColor": "#1e3a5f",
  "roofColor": "#0d1f35",
  "brickAccent": false,
  "balconyStyle": "standard",
  "windowRows": 2,
  "confidence": <güven yüzdesi 0-100>
}`;
            parts.push({ text: prompt });

        } else {
            prompt = `Sen bir bina analiz uzmanısın. Bu bina görseli/görsellerine bakarak bilgileri JSON formatında çıkar.

Sadece şu JSON'u döndür, başka hiçbir şey yazma:
{
  "floors": <zemin hariç normal kat sayısı>,
  "basementFloors": <bodrum kat sayısı, 0 veya pozitif>,
  "hasGroundShop": <zemin katta dükkan var mı, true/false>,
  "hasDuplex": <dubleks/çatı katı var mı, true/false>,
  "buildingWidth": <bina genişlik tahmini metre, 10-25 arası>,
  "buildingDepth": <bina derinlik tahmini metre, 6-14 arası>,
  "wallColor": <dış duvar rengi HEX>,
  "bandColor": <kat arası bant rengi HEX>,
  "roofColor": <çatı rengi HEX>,
  "brickAccent": <tuğla detay var mı, true/false>,
  "balconyStyle": <"standard", "wide" veya "narrow">,
  "windowRows": <katta pencere sıra sayısı, 2-4>,
  "buildingName": <binada tabela varsa yaz, yoksa null>,
  "confidence": <doğruluk yüzdesi 0-100>
}`;
            parts.push({ text: prompt });
            for (const file of imageFiles) {
                parts.push({ inline_data: { mime_type: file.mimeType, data: file.base64 } });
            }
        }

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts }],
                        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
                    })
                }
            );

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(`Gemini API hatası: ${response.status} — ${errData?.error?.message || ''}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Gemini geçerli JSON döndürmedi');

            const result = JSON.parse(jsonMatch[0]) as BuildingAnalysisResult;
            setAnalysisResult(result);
            setManualResult(result);
            setManualMode(true);
            onAnalysisComplete(result);
        } catch (err: any) {
            setError(err.message || 'Analiz sırasında hata oluştu');
        } finally {
            setAnalyzing(false);
        }
    };

    const applyManual = () => {
        setAnalysisResult(manualResult);
        onAnalysisComplete(manualResult);
        setShowPanel(false);
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '7px 10px', borderRadius: '8px',
        border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box',
    };
    const labelStyle: React.CSSProperties = {
        fontSize: '11px', fontWeight: 700, color: '#6b7280',
        display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px',
    };

    return (
        <>
            <button
                onClick={() => setShowPanel(true)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '0 14px', height: '40px',
                    background: analysisResult
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white', border: 'none', borderRadius: '10px',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                }}
            >
                <span>{analysisResult ? '✅' : '🤖'}</span>
                {analysisResult ? 'AI Analiz Tamam' : 'AI Bina Analizi'}
            </button>

            {showPanel && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }} onClick={(e) => { if (e.target === e.currentTarget) setShowPanel(false); }}>
                    <div style={{
                        background: 'white', borderRadius: '20px', width: '100%', maxWidth: '620px',
                        overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        maxHeight: '92vh', display: 'flex', flexDirection: 'column'
                    }}>
                        {/* Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            padding: '18px 24px', display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', flexShrink: 0
                        }}>
                            <div>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: 800 }}>
                                    🤖 AI Bina Analizi
                                </h2>
                                <p style={{ color: 'rgba(255,255,255,0.75)', margin: '4px 0 0', fontSize: '12px' }}>
                                    AutoCAD DXF, görsel veya PDF yükle → AI analiz etsin → Manuel düzenle
                                </p>
                            </div>
                            <button onClick={() => setShowPanel(false)} style={{
                                background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
                                width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '18px'
                            }}>×</button>
                        </div>

                        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

                            {/* Upload area */}
                            <div
                                onClick={() => fileRef.current?.click()}
                                style={{
                                    border: '2px dashed #c7d2fe', borderRadius: '14px', padding: '18px',
                                    textAlign: 'center', cursor: 'pointer', background: '#fafafe', transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#f0f0ff'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.background = '#fafafe'; }}
                            >
                                <div style={{ fontSize: '28px', marginBottom: '6px' }}>📐</div>
                                <p style={{ margin: '0 0 3px', fontWeight: 700, color: '#374151', fontSize: '14px' }}>
                                    Dosya ekle
                                </p>
                                <p style={{ margin: 0, color: '#9ca3af', fontSize: '11px' }}>
                                    <strong style={{ color: '#6366f1' }}>DXF (AutoCAD)</strong> • JPG, PNG, WEBP • PDF — Maksimum 5 dosya
                                </p>
                            </div>

                            <input
                                ref={fileRef}
                                type="file"
                                accept=".dxf,image/jpeg,image/png,image/webp,image/gif,application/pdf"
                                multiple
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />

                            {/* DXF özet bilgisi */}
                            {dxfSummary && (
                                <div style={{
                                    marginTop: '14px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                                    border: '1px solid #93c5fd', borderRadius: '12px', padding: '14px'
                                }}>
                                    <p style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '13px', color: '#1e40af' }}>
                                        📐 DXF Dosyası Okundu
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                        {[
                                            { label: 'Genişlik', value: `${dxfSummary.widthM} m` },
                                            { label: 'Derinlik', value: `${dxfSummary.depthM} m` },
                                            { label: 'Katman sayısı', value: dxfSummary.layers.length },
                                        ].map(item => (
                                            <div key={item.label} style={{ background: 'white', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>{item.label}</div>
                                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e40af' }}>{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {dxfSummary.layers.length > 0 && (
                                        <details style={{ marginTop: '8px' }}>
                                            <summary style={{ fontSize: '11px', color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}>
                                                Katmanları gör ({dxfSummary.layers.length})
                                            </summary>
                                            <p style={{ margin: '6px 0 0', fontSize: '10px', color: '#475569', lineHeight: 1.6 }}>
                                                {dxfSummary.layers.join(' · ')}
                                            </p>
                                        </details>
                                    )}
                                </div>
                            )}

                            {/* Yüklenen dosyalar */}
                            {uploadedFiles.length > 0 && (
                                <div style={{ marginTop: '14px' }}>
                                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>
                                        📁 Yüklenen Dosyalar ({uploadedFiles.length}/5)
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                                        {uploadedFiles.map((file, i) => (
                                            <div key={i} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb', background: '#f9fafb' }}>
                                                {file.isDxf ? (
                                                    <div style={{ height: '72px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', background: '#eff6ff' }}>
                                                        <span style={{ fontSize: '24px' }}>📐</span>
                                                        <span style={{ fontSize: '9px', color: '#3b82f6', fontWeight: 700 }}>DXF</span>
                                                        <span style={{ fontSize: '8px', color: '#6b7280', padding: '0 4px', textAlign: 'center', wordBreak: 'break-all' }}>{file.name.slice(0, 12)}</span>
                                                    </div>
                                                ) : file.mimeType === 'application/pdf' ? (
                                                    <div style={{ height: '72px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                                        <span style={{ fontSize: '24px' }}>📄</span>
                                                        <span style={{ fontSize: '9px', color: '#6b7280', textAlign: 'center', padding: '0 4px', wordBreak: 'break-all' }}>{file.name.slice(0, 12)}</span>
                                                    </div>
                                                ) : (
                                                    <img src={file.previewUrl} alt={file.name} style={{ width: '100%', height: '72px', objectFit: 'cover', display: 'block' }} />
                                                )}
                                                <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(239,68,68,0.9)', border: 'none', color: 'white', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
                                            </div>
                                        ))}
                                        {uploadedFiles.length < 5 && (
                                            <div onClick={() => fileRef.current?.click()} style={{ height: '72px', border: '2px dashed #c7d2fe', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '22px', color: '#6366f1' }}>+</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626', fontSize: '13px' }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            {/* Manuel düzenleme formu */}
                            {manualMode && (
                                <div style={{ marginTop: '16px', border: '1px solid #e5e7eb', borderRadius: '14px', overflow: 'hidden' }}>
                                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 800, fontSize: '13px', color: '#374151' }}>✏️ Manuel Düzenle</span>
                                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>AI sonucunu burada düzenleyebilirsiniz</span>
                                    </div>
                                    <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={labelStyle}>Normal Kat Sayısı</label>
                                            <input type="number" style={inputStyle} value={manualResult.floors}
                                                onChange={e => setManualResult(p => ({ ...p, floors: +e.target.value }))} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Bodrum Kat</label>
                                            <input type="number" style={inputStyle} value={manualResult.basementFloors}
                                                onChange={e => setManualResult(p => ({ ...p, basementFloors: +e.target.value }))} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Genişlik (m)</label>
                                            <input type="number" step="0.5" style={inputStyle} value={manualResult.buildingWidth}
                                                onChange={e => setManualResult(p => ({ ...p, buildingWidth: +e.target.value }))} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Derinlik (m)</label>
                                            <input type="number" step="0.5" style={inputStyle} value={manualResult.buildingDepth}
                                                onChange={e => setManualResult(p => ({ ...p, buildingDepth: +e.target.value }))} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Pencere Sırası</label>
                                            <input type="number" min={1} max={4} style={inputStyle} value={manualResult.windowRows}
                                                onChange={e => setManualResult(p => ({ ...p, windowRows: +e.target.value }))} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Balkon Stili</label>
                                            <select style={inputStyle} value={manualResult.balconyStyle}
                                                onChange={e => setManualResult(p => ({ ...p, balconyStyle: e.target.value as any }))}>
                                                <option value="standard">Standart</option>
                                                <option value="wide">Geniş</option>
                                                <option value="narrow">Dar</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ ...labelStyle, marginBottom: 0 }}>
                                                <input type="checkbox" checked={manualResult.hasGroundShop}
                                                    onChange={e => setManualResult(p => ({ ...p, hasGroundShop: e.target.checked }))} />
                                                {' '}Zemin Dükkan
                                            </label>
                                            <label style={{ ...labelStyle, marginBottom: 0 }}>
                                                <input type="checkbox" checked={manualResult.hasDuplex}
                                                    onChange={e => setManualResult(p => ({ ...p, hasDuplex: e.target.checked }))} />
                                                {' '}Dubleks Kat
                                            </label>
                                            <label style={{ ...labelStyle, marginBottom: 0 }}>
                                                <input type="checkbox" checked={manualResult.brickAccent}
                                                    onChange={e => setManualResult(p => ({ ...p, brickAccent: e.target.checked }))} />
                                                {' '}Tuğla Detay
                                            </label>
                                        </div>
                                        <div style={{ display: 'grid', gap: '6px' }}>
                                            <label style={labelStyle}>Renkler</label>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                <input type="color" value={manualResult.wallColor}
                                                    onChange={e => setManualResult(p => ({ ...p, wallColor: e.target.value }))}
                                                    style={{ width: '32px', height: '32px', border: 'none', cursor: 'pointer', borderRadius: '6px' }} title="Duvar" />
                                                <input type="color" value={manualResult.bandColor}
                                                    onChange={e => setManualResult(p => ({ ...p, bandColor: e.target.value }))}
                                                    style={{ width: '32px', height: '32px', border: 'none', cursor: 'pointer', borderRadius: '6px' }} title="Bant" />
                                                <input type="color" value={manualResult.roofColor}
                                                    onChange={e => setManualResult(p => ({ ...p, roofColor: e.target.value }))}
                                                    style={{ width: '32px', height: '32px', border: 'none', cursor: 'pointer', borderRadius: '6px' }} title="Çatı" />
                                                <span style={{ fontSize: '10px', color: '#9ca3af' }}>Duvar · Bant · Çatı</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AI analiz sonucu özet */}
                            {analysisResult && !analyzing && !manualMode && (
                                <div style={{ marginTop: '16px', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '16px' }}>
                                    <p style={{ margin: '0 0 12px', fontWeight: 800, fontSize: '13px', color: '#065f46' }}>
                                        ✅ Analiz Tamamlandı — %{analysisResult.confidence} güven
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {[
                                            { label: '🏢 Normal Kat', value: `${analysisResult.floors} kat` },
                                            { label: '⬇️ Bodrum', value: `${analysisResult.basementFloors} kat` },
                                            { label: '🏪 Zemin Dükkan', value: analysisResult.hasGroundShop ? 'Var' : 'Yok' },
                                            { label: '🏠 Dubleks', value: analysisResult.hasDuplex ? 'Var' : 'Yok' },
                                            { label: '📐 Genişlik', value: `${analysisResult.buildingWidth}m` },
                                            { label: '🪟 Pencere', value: `${analysisResult.windowRows} sıra` },
                                        ].map(item => (
                                            <div key={item.label} style={{ background: 'white', borderRadius: '8px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '11px', color: '#6b7280' }}>{item.label}</span>
                                                <span style={{ fontSize: '12px', fontWeight: 700 }}>{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer butonlar */}
                        <div style={{ padding: '14px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap', background: '#fafafa', flexShrink: 0 }}>
                            <button onClick={() => setShowPanel(false)} style={{ padding: '10px 18px', background: '#f3f4f6', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                                Kapat
                            </button>

                            {!manualMode && (
                                <button
                                    onClick={() => { setManualMode(true); }}
                                    style={{ padding: '10px 18px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#374151' }}
                                >
                                    ✏️ Manuel Gir
                                </button>
                            )}

                            {uploadedFiles.length > 0 && !analyzing && (
                                <button onClick={analyzeWithGemini} style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                                    🔍 AI ile Analiz Et ({uploadedFiles.length} dosya)
                                </button>
                            )}

                            {analyzing && (
                                <button disabled style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, opacity: 0.7, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'not-allowed' }}>
                                    <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                    AI Analiz Ediyor...
                                </button>
                            )}

                            {manualMode && (
                                <button onClick={applyManual} style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                                    ✨ 3D Modele Uygula
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
};

export default AIBuildingAnalyzer;