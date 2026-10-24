import * as pdfjsLib from 'pdfjs-dist';
import DxfParser from 'dxf-parser';
import { requestAI } from '../../services/aiService';
import { FloorPlanData, FloorType, Point } from './types';

pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface FloorPlanDraftInfo {
    confidence: number;
    scaleConfidence: number;
    warnings: string[];
}

interface ModelPoint { x: number; y: number }

interface ModelResponse {
    planName?: string;
    bounds?: { width?: number; depth?: number };
    confidence?: number;
    scaleConfidence?: number;
    walls?: Array<{
        start: ModelPoint;
        end: ModelPoint;
        thickness?: number;
        height?: number;
        wallType?: string;
    }>;
    openings?: Array<{
        wallIndex: number;
        type: 'door' | 'window';
        position: number;
        width?: number;
        height?: number;
        sillHeight?: number;
        doorType?: string;
        windowType?: string;
    }>;
    rooms?: Array<{
        name?: string;
        points?: ModelPoint[];
        floorType?: string;
    }>;
    columns?: Array<{
        x: number;
        y: number;
        width?: number;
        depth?: number;
        rotation?: number;
        height?: number;
    }>;
    warnings?: string[];
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function imagePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            const resize = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.naturalWidth * resize));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * resize));
            const context = canvas.getContext('2d');
            if (!context) {
                URL.revokeObjectURL(url);
                reject(new Error('Plan önizlemesi oluşturulamadı.'));
                return;
            }
            context.fillStyle = '#fff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Görsel önizlemesi oluşturulamadı.'));
        };
        image.src = url;
    });
}

async function pdfPreview(file: File): Promise<string> {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const page = await pdf.getPage(1);
    const initialViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(3, 2400 / initialViewport.width) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PDF önizlemesi oluşturulamadı.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.9);
}

export async function makePlanPreview(file: File): Promise<string> {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        return pdfPreview(file);
    }
    return imagePreview(file);
}

const unitToMetres: Record<number, number> = {
    1: 0.0254, 2: 0.3048, 3: 1609.344, 4: 0.001, 5: 0.01, 6: 1,
    7: 1000, 8: 2.54e-8, 9: 0.0000254, 10: 0.9144, 11: 1e-10,
    12: 1e-9, 13: 1e-6, 14: 0.1, 15: 10, 16: 100,
    17: 1e9, 18: 1.495978707e11, 19: 9.460730472e15, 20: 3.085677581e16,
};

export function parseDxfGeometry(text: string): {
    geometry: Record<string, unknown>;
    previewUrl: string;
    previewScale: number;
} {
    const dxf = new DxfParser().parseSync(text) as any;
    const segments: Array<{ layer: string; type: string; points: ModelPoint[]; closed?: boolean }> = [];
    const labels: Array<{ layer: string; text: string; at?: ModelPoint }> = [];
    const entityCounts: Record<string, number> = {};

    for (const entity of dxf.entities || []) {
        entityCounts[entity.type] = (entityCounts[entity.type] || 0) + 1;
        const layer = String(entity.layer || '0');
        if (entity.type === 'LINE' && entity.vertices?.length >= 2) {
            segments.push({ layer, type: entity.type, points: entity.vertices.slice(0, 2).map((p: any) => ({ x: p.x, y: p.y })) });
        } else if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && entity.vertices?.length >= 2) {
            segments.push({
                layer,
                type: entity.type,
                points: entity.vertices.map((p: any) => ({ x: p.x, y: p.y })),
                closed: Boolean(entity.shape),
            });
        } else if (entity.type === 'ARC' && entity.center && finite(entity.radius)) {
            const start = entity.startAngle || 0;
            let end = entity.endAngle || 0;
            if (end <= start) end += Math.PI * 2;
            const pieces = Math.min(24, Math.max(4, Math.ceil((end - start) / (Math.PI / 12))));
            const points = Array.from({ length: pieces + 1 }, (_, index) => {
                const angle = start + (end - start) * index / pieces;
                return { x: entity.center.x + Math.cos(angle) * entity.radius, y: entity.center.y + Math.sin(angle) * entity.radius };
            });
            segments.push({ layer, type: entity.type, points });
        } else if (entity.type === 'CIRCLE' && entity.center && finite(entity.radius)) {
            const points = Array.from({ length: 25 }, (_, index) => {
                const angle = Math.PI * 2 * index / 24;
                return { x: entity.center.x + Math.cos(angle) * entity.radius, y: entity.center.y + Math.sin(angle) * entity.radius };
            });
            segments.push({ layer, type: entity.type, points, closed: true });
        } else if (entity.type === 'TEXT' || entity.type === 'MTEXT' || entity.type === 'DIMENSION') {
            const label = String(entity.text || entity.textString || entity.actualMeasurement || '').trim();
            if (label) labels.push({ layer, text: label.slice(0, 120), at: entity.position ? { x: entity.position.x, y: entity.position.y } : undefined });
        }
    }

    if (!segments.length) throw new Error('DXF dosyasında okunabilir çizgi veya polilin bulunamadı.');
    if (segments.length > 5000) throw new Error('DXF çok yoğun. Lütfen yalnızca kat planını içeren daha sade bir DXF dışa aktarın.');

    const allPoints = segments.flatMap(segment => segment.points).filter(point => finite(point.x) && finite(point.y));
    const minX = Math.min(...allPoints.map(point => point.x));
    const maxX = Math.max(...allPoints.map(point => point.x));
    const minY = Math.min(...allPoints.map(point => point.y));
    const maxY = Math.max(...allPoints.map(point => point.y));
    const rawWidth = maxX - minX;
    const rawDepth = maxY - minY;
    const unitValue = dxf.header?.$INSUNITS ?? dxf.header?.['$INSUNITS'];
    const unitCode = Number(unitValue?.value ?? unitValue ?? 0);
    const metersPerUnit = unitToMetres[unitCode] || null;
    const previewWidth = 1200;
    const previewHeight = Math.max(1, Math.round(previewWidth * rawDepth / Math.max(rawWidth, 0.001)));
    const paths = segments.map(segment => {
        const coords = segment.points.map(point => `${(point.x - minX) / Math.max(rawWidth, 0.001) * previewWidth},${(maxY - point.y) / Math.max(rawDepth, 0.001) * previewHeight}`);
        return `<polyline points="${coords.join(' ')}" fill="none" stroke="#334155" stroke-width="2"${segment.closed ? ' stroke-linejoin="round"' : ''}/>`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${previewWidth}" height="${previewHeight}" viewBox="0 0 ${previewWidth} ${previewHeight}"><rect width="100%" height="100%" fill="white"/>${paths}</svg>`;
    const previewUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const previewScale = metersPerUnit ? rawWidth * metersPerUnit / previewWidth : 0.01;

    return {
        previewUrl,
        previewScale,
        geometry: {
            unitsCode: unitCode || null,
            metersPerUnit,
            bounds: { minX, minY, maxX, maxY, width: rawWidth, depth: rawDepth },
            layers: [...new Set(segments.map(segment => segment.layer))].slice(0, 100),
            entityCounts,
            segments,
            labels: labels.slice(0, 500),
        },
    };
}

function asPoint(value: unknown): ModelPoint | null {
    if (!value || typeof value !== 'object') return null;
    const point = value as ModelPoint;
    if (!finite(point.x) || !finite(point.y)) return null;
    if (Math.abs(point.x) > 300 || Math.abs(point.y) > 300) return null;
    return { x: point.x, y: point.y };
}

export function createPlanDraft(raw: unknown, name: string, blueprint?: FloorPlanData['blueprint']): {
    plan: FloorPlanData;
    info: FloorPlanDraftInfo;
} {
    if (!raw || typeof raw !== 'object') throw new Error('AI plan verisi okunamadı.');
    const response = raw as ModelResponse;
    const rawWalls = Array.isArray(response.walls) ? response.walls.slice(0, 800) : [];
    const wallIndexMap = new Map<number, number>();
    let nextWallIndex = 0;
    const walls = rawWalls.flatMap((wall, index) => {
        const start = asPoint(wall?.start);
        const end = asPoint(wall?.end);
        if (!start || !end || Math.hypot(end.x - start.x, end.y - start.y) < 0.15) return [];
        wallIndexMap.set(index, nextWallIndex++);
        return [{
            id: `ai-wall-${index + 1}`,
            start,
            end,
            thickness: clamp(finite(wall.thickness) ? wall.thickness : 0.2, 0.08, 0.6),
            height: clamp(finite(wall.height) ? wall.height : 2.8, 2, 6),
            wallType: (['standard', 'low_wall', 'balcony_glass', 'balcony_railing'].includes(wall.wallType || '')
                ? wall.wallType
                : 'standard') as 'standard' | 'low_wall' | 'balcony_glass' | 'balcony_railing',
        }];
    });
    if (!walls.length) throw new Error('AI planda kullanılabilir duvar bulamadı. Daha net bir plan yükleyin.');

    const openings = (Array.isArray(response.openings) ? response.openings : []).flatMap((opening, index) => {
        const sourceWallIndex = opening?.wallIndex;
        if (!Number.isInteger(sourceWallIndex) || sourceWallIndex < 0) return [];
        const wallIndex = wallIndexMap.get(sourceWallIndex);
        if (wallIndex === undefined || wallIndex >= walls.length) return [];
        if (opening.type !== 'door' && opening.type !== 'window') return [];
        return [{
            id: `ai-opening-${index + 1}`,
            wallId: walls[wallIndex].id,
            type: opening.type,
            position: clamp(finite(opening.position) ? opening.position : 0.5, 0.02, 0.98),
            width: clamp(finite(opening.width) ? opening.width : opening.type === 'door' ? 0.9 : 1.4, 0.45, 4),
            height: clamp(finite(opening.height) ? opening.height : opening.type === 'door' ? 2.1 : 1.3, 0.4, 3.5),
            sillHeight: clamp(finite(opening.sillHeight) ? opening.sillHeight : opening.type === 'door' ? 0 : 0.85, 0, 2.5),
            doorType: opening.doorType as 'standard' | 'steel' | 'double_glass' | 'sliding' | undefined,
            windowType: opening.windowType as 'standard' | 'french' | 'small' | undefined,
        }];
    });

    const floorTypes: FloorType[] = ['parquet_light', 'parquet_dark', 'marble', 'tile', 'carpet', 'balcony_tile'];
    const rooms = (Array.isArray(response.rooms) ? response.rooms : []).slice(0, 150).flatMap((room, index) => {
        const points = (Array.isArray(room?.points) ? room.points : []).map(asPoint).filter((point): point is ModelPoint => Boolean(point));
        if (points.length < 3) return [];
        return [{
            id: `ai-room-${index + 1}`,
            name: String(room.name || `Oda ${index + 1}`).slice(0, 80),
            points: points as Point[],
            floorType: floorTypes.includes(room.floorType as FloorType) ? room.floorType as FloorType : 'parquet_light',
        }];
    });

    const columns = (Array.isArray(response.columns) ? response.columns : []).slice(0, 300).flatMap((column, index) => {
        if (!finite(column?.x) || !finite(column?.y)) return [];
        return [{
            id: `ai-column-${index + 1}`,
            x: column.x,
            y: column.y,
            width: clamp(finite(column.width) ? column.width : 0.3, 0.15, 1.5),
            depth: clamp(finite(column.depth) ? column.depth : 0.3, 0.15, 1.5),
            rotation: finite(column.rotation) ? column.rotation : 0,
            height: clamp(finite(column.height) ? column.height : 2.8, 2, 6),
        }];
    });

    const points = [
        ...walls.flatMap(wall => [wall.start, wall.end]),
        ...rooms.flatMap(room => room.points),
        ...columns.map(column => ({ x: column.x, y: column.y })),
    ];
    const minX = Math.min(...points.map(point => point.x));
    const minY = Math.min(...points.map(point => point.y));
    const maxX = Math.max(...points.map(point => point.x));
    const maxY = Math.max(...points.map(point => point.y));
    if (![minX, minY, maxX, maxY].every(Number.isFinite) || maxX - minX <= 0 || maxY - minY <= 0) {
        throw new Error('AI plan sınırları geçerli değil.');
    }
    const shift = (point: Point): Point => ({ x: point.x - minX, y: point.y - minY });
    const shiftedWalls = walls.map(wall => ({ ...wall, start: shift(wall.start), end: shift(wall.end) }));
    const shiftedRooms = rooms.map(room => ({ ...room, points: room.points.map(shift) }));
    const shiftedColumns = columns.map(column => ({ ...column, x: column.x - minX, y: column.y - minY }));
    const warnings = (Array.isArray(response.warnings) ? response.warnings : [])
        .filter((warning): warning is string => typeof warning === 'string')
        .slice(0, 12)
        .map(warning => warning.slice(0, 220));
    const confidence = clamp(finite(response.confidence) ? response.confidence : 0.5, 0, 1);
    const scaleConfidence = clamp(finite(response.scaleConfidence) ? response.scaleConfidence : 0.4, 0, 1);

    return {
        plan: {
            id: `plan_ai_${Date.now()}`,
            name: String(response.planName || name.replace(/\.[^.]+$/, '') || 'AI Kat Planı').slice(0, 100),
            walls: shiftedWalls,
            openings,
            rooms: shiftedRooms,
            furniture: [],
            columns: shiftedColumns,
            blueprint,
            scale: 50,
        },
        info: { confidence, scaleConfidence, warnings },
    };
}

export async function analyzeFloorPlan(source: Parameters<typeof requestAI>[0]): Promise<ModelResponse> {
    return requestAI<ModelResponse>(source as Parameters<typeof requestAI>[0]);
}
