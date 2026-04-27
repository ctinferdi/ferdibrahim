import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import DxfParser from 'dxf-parser';


/* ─── Types ────────────────────────────────────────────────────── */
type RoomType = 'salon' | 'yatak' | 'mutfak' | 'banyo' | 'wc' | 'balkon' | 'koridor' | 'depo' | 'dükkan' | 'ofis';
type ToolType = 'select' | 'room' | 'wall' | 'door' | 'window' | 'erase' | 'column' | 'beam' | 'slab';

interface Room   { id: string; x: number; y: number; w: number; h: number; type: RoomType; label: string; height?: number; }
interface Wall   { id: string; x1: number; y1: number; x2: number; y2: number; thickness?: number; height?: number; color?: string; }

interface DoorEl { id: string; x: number; y: number; w: number; angle?: number; color?: string; }
interface WinEl  { id: string; x: number; y: number; w: number; h?: number; angle?: number; wallSide: 'top'|'bottom'|'left'|'right'; color?: string; }

interface Column { id: string; x: number; y: number; w: number; h: number; color?: string; }
interface Beam   { id: string; x1: number; y1: number; x2: number; y2: number; thickness?: number; height?: number; color?: string; }
interface Slab   { id: string; x: number; y: number; w: number; h: number; thickness?: number; color?: string; }

interface FloorData {
    floor: number; label: string;
    rooms: Room[]; walls: Wall[]; doors: DoorEl[]; windows: WinEl[]; columns: Column[]; beams: Beam[]; slabs: Slab[];
}



interface Props { isOpen: boolean; onClose: () => void; projectName?: string; }

/* ─── Constants ────────────────────────────────────────────────── */
const GRID      = 20;   // px per 0.5m
const PX_TO_M   = 0.5 / GRID;  // 0.025 m/px
const FLOOR_H   = 3.0;  // metres per storey (3D)
const SLAB_H    = 0.25;


const ROOM_FILL: Record<RoomType, string>  = {
    salon:'#bfdbfe', yatak:'#fbcfe8', mutfak:'#fef08a', banyo:'#6ee7b7',
    wc:'#e9d5ff', balkon:'#bbf7d0', koridor:'#e5e7eb', depo:'#fde68a',
    dükkan:'#fca5a5', ofis:'#bae6fd',
};
const ROOM_LABELS: Record<RoomType, string> = {
    salon:'Salon', yatak:'Yatak', mutfak:'Mutfak', banyo:'Banyo', wc:'WC',
    balkon:'Balkon', koridor:'Koridor', depo:'Depo', dükkan:'Dükkan', ofis:'Ofis',
};
const ROOM_3D: Record<RoomType, string> = {
    salon:'#93c5fd', yatak:'#f9a8d4', mutfak:'#fde047', banyo:'#34d399',
    wc:'#c4b5fd', balkon:'#86efac', koridor:'#d1d5db', depo:'#fcd34d',
    dükkan:'#f87171', ofis:'#7dd3fc',
};

const uid  = () => Math.random().toString(36).slice(2, 9);
const snap = (v: number) => Math.round(v / GRID) * GRID;

/* ─── 3D Room mesh ──────────────────────────────────────────────── */
function Room3D({ room, fi, centerX, centerZ }: { room: Room; fi: number; centerX: number; centerZ: number }) {
    const isBalcony = room.type === 'balkon';
    const h = room.height ?? (isBalcony ? 1.05 : FLOOR_H);
    const w = room.w * PX_TO_M;

    const d = room.h * PX_TO_M;
    const cx = room.x * PX_TO_M + w / 2 - centerX;
    const cy = fi * (FLOOR_H + SLAB_H) + h / 2;
    const cz = room.y * PX_TO_M + d / 2 - centerZ;
    const col = ROOM_3D[room.type];

    return (
        <group position={[cx, cy, cz]}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial 
                    color={col} 
                    transparent={isBalcony} 
                    opacity={isBalcony ? 0.35 : 0.9} 
                    roughness={isBalcony ? 0 : 0.5} 
                    metalness={isBalcony ? 1 : 0.1} 
                />

            </mesh>
            {isBalcony && (
                <mesh position={[0, 0.53, 0]}>
                    <boxGeometry args={[w + 0.05, 0.05, d + 0.05]} />
                    <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
                </mesh>
            )}
            {/* outline */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
                <lineBasicMaterial color="#1e293b" />
            </lineSegments>
        </group>
    );
}


function Wall3D({ wall, fi, centerX, centerZ, windows, doors }: { wall: Wall; fi: number; centerX: number; centerZ: number, windows: WinEl[], doors: DoorEl[] }) {
    const dx = (wall.x2 - wall.x1) * PX_TO_M;
    const dz = (wall.y2 - wall.y1) * PX_TO_M;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.01) return null;

    const angle = Math.atan2(dz, dx);
    const h = wall.height ?? FLOOR_H;
    const thickness = (wall.thickness ?? 15) * PX_TO_M;
    const color = wall.color || "#e2e8f0";

    const wallStart = new THREE.Vector2(wall.x1, wall.y1);
    const wallEnd   = new THREE.Vector2(wall.x2, wall.y2);
    const wallDir   = new THREE.Vector2().subVectors(wallEnd, wallStart).normalize();

    const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
        const l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
        if (l2 === 0) return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.sqrt(Math.pow(px - (x1 + t * (x2 - x1)), 2) + Math.pow(py - (y1 + t * (y2 - y1)), 2));
    };

    const openings: { pos: number, w: number, type: 'win'|'door' }[] = [];
    [...windows, ...doors].forEach((o: any) => {
        const d = distToSegment(o.x, o.y, wall.x1, wall.y1, wall.x2, wall.y2);
        if (d < 15) { 
            const offset = (new THREE.Vector2(o.x, o.y).sub(wallStart)).dot(wallDir);
            openings.push({ pos: offset * PX_TO_M, w: o.w * PX_TO_M, type: o.wallSide ? 'win' : 'door' });
        }
    });

    openings.sort((a, b) => a.pos - b.pos);

    const segments: { start: number, end: number, type: 'solid' | 'hole' }[] = [];
    let last = 0;
    openings.forEach(op => {
        const start = Math.max(0, op.pos - op.w / 2);
        const end   = Math.min(len, op.pos + op.w / 2);
        if (start > last) segments.push({ start: last, end: start, type: 'solid' });
        segments.push({ start: start, end: end, type: 'hole' });
        last = end;
    });
    if (last < len) segments.push({ start: last, end: len, type: 'solid' });

    return (
        <group position={[wall.x1 * PX_TO_M - centerX, fi * (FLOOR_H + SLAB_H), wall.y1 * PX_TO_M - centerZ]} rotation={[0, -angle, 0]}>
            {segments.map((seg, i) => {
                const sLen = seg.end - seg.start;
                if (sLen <= 0.01) return null;
                const scx = seg.start + sLen / 2;
                
                if (seg.type === 'hole') {
                    const isWin = openings.find(o => Math.abs(o.pos - scx) < 0.1 && o.type === 'win');
                    return (
                        <group key={i}>
                            {/* Lintels (top part of windows/doors) */}
                            <mesh position={[scx, h - 0.4, 0]} castShadow receiveShadow>
                                <boxGeometry args={[sLen, 0.8, thickness]} />
                                <meshStandardMaterial color={color} />
                            </mesh>
                            {/* Sills (bottom part of windows only) */}
                            {isWin && (
                                <mesh position={[scx, 0.45, 0]} castShadow receiveShadow>
                                    <boxGeometry args={[sLen, 0.9, thickness]} />
                                    <meshStandardMaterial color={color} />
                                </mesh>
                            )}
                        </group>
                    );
                }

                return (
                    <mesh key={i} position={[scx, h/2, 0]} castShadow receiveShadow>
                        <boxGeometry args={[sLen, h, thickness]} />
                        <meshStandardMaterial color={color} roughness={0.7} />
                    </mesh>
                );
            })}
        </group>
    );
}


function Column3D({ col, fi, centerX, centerZ }: { col: Column; fi: number; centerX: number; centerZ: number }) {
    const w = col.w * PX_TO_M;
    const d = col.h * PX_TO_M;
    const cx = (col.x * PX_TO_M + w / 2) - centerX;
    const cy = fi * (FLOOR_H + SLAB_H) + FLOOR_H / 2;
    const cz = (col.y * PX_TO_M + d / 2) - centerZ;

    return (
        <mesh position={[cx, cy, cz]} castShadow receiveShadow>
            <boxGeometry args={[w, FLOOR_H, d]} />
            <meshStandardMaterial color={col.color || "#1e293b"} roughness={0.3} metalness={0.1} />
        </mesh>
    );
}


function Window3D({ win, fi, centerX, centerZ }: { win: WinEl; fi: number; centerX: number; centerZ: number }) {
    const w = win.w * PX_TO_M;
    const h = (win.h ?? 1.5);
    const cx = (win.x * PX_TO_M) - centerX;
    const cy = fi * (FLOOR_H + SLAB_H) + 0.9 + h/2; // sills typically at 90cm
    const cz = (win.y * PX_TO_M) - centerZ;
    const angle = win.angle ?? 0;

    return (
        <group position={[cx, cy, cz]} rotation={[0, -angle, 0]}>
            <mesh castShadow>
                <boxGeometry args={[w - 0.05, h - 0.05, 0.08]} />
                <meshStandardMaterial color={win.color || "#93c5fd"} transparent opacity={0.4} metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh>
                <boxGeometry args={[w, h, 0.15]} />
                <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
            </mesh>
        </group>
    );
}



function Beam3D({ beam, fi, centerX, centerZ }: { beam: Beam; fi: number; centerX: number; centerZ: number }) {
    const dx = (beam.x2 - beam.x1) * PX_TO_M;
    const dz = (beam.y2 - beam.y1) * PX_TO_M;
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    const cx = (beam.x1 * PX_TO_M + dx / 2) - centerX;
    const bh = beam.height ?? 0.6; // depth
    const cy = fi * (FLOOR_H + SLAB_H) + FLOOR_H - bh / 2;
    const cz = (beam.y1 * PX_TO_M + dz / 2) - centerZ;
    const thickness = (beam.thickness ?? 25) * PX_TO_M;
    return (
        <mesh position={[cx, cy, cz]} rotation={[0, -angle, 0]} castShadow receiveShadow>
            <boxGeometry args={[len, bh, thickness]} />
            <meshStandardMaterial color={beam.color || "#475569"} roughness={0.4} metalness={0.2} />
        </mesh>
    );
}


function Door3D({ door, fi, centerX, centerZ }: { door: DoorEl; fi: number; centerX: number; centerZ: number }) {
    const w = door.w * PX_TO_M;
    const cx = (door.x * PX_TO_M) - centerX;
    const cy = fi * (FLOOR_H + SLAB_H) + 1.05; // 2.1m height
    const cz = (door.y * PX_TO_M) - centerZ;
    const angle = door.angle ?? 0;

    return (
        <group position={[cx, cy, cz]} rotation={[0, -angle, 0]}>
            <mesh castShadow>
                <boxGeometry args={[w - 0.02, 2.1, 0.15]} />
                <meshStandardMaterial color={door.color || "#451a03"} roughness={0.8} />
            </mesh>
            {/* Frame */}
            <mesh>
                <boxGeometry args={[w + 0.05, 2.15, 0.18]} />
                <meshStandardMaterial color="#1e293b" />
            </mesh>
        </group>
    );
}


function Slab3D({ fi, minX, minZ, maxX, maxZ, centerX, centerZ }: any) {
    const w = (maxX - minX) * PX_TO_M;
    const d = (maxZ - minZ) * PX_TO_M;
    if (w <= 0 || d <= 0) return null;
    const cx = (minX + (maxX - minX) / 2) * PX_TO_M - centerX;
    const cy = fi * (FLOOR_H + SLAB_H) - SLAB_H / 2;
    const cz = (minZ + (maxZ - minZ) / 2) * PX_TO_M - centerZ;
    return (
        <mesh position={[cx, cy, cz]} receiveShadow>
            <boxGeometry args={[w + 0.2, SLAB_H, d + 0.2]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.7} />
        </mesh>
    );
}

function Building3DScene({ floors }: { floors: FloorData[] }) {
    // Determine bounding box of all elements for centering
    const allElems = useMemo(() => {
        const res: {x:number, y:number}[] = [];
        floors.forEach(f => {
            f.rooms.forEach(r => { res.push({x:r.x, y:r.y}, {x:r.x+r.w, y:r.y+r.h}); });
            f.walls.forEach(w => { res.push({x:w.x1, y:w.y1}, {x:w.x2, y:w.y2}); });
            f.columns?.forEach(c => { res.push({x:c.x, y:c.y}, {x:c.x+c.w, y:c.y+c.h}); });
        });
        return res;
    }, [floors]);

    const centerX = useMemo(() => {
        if (!allElems.length) return 0;
        const xs = allElems.map(p => p.x);
        return ((Math.min(...xs) + Math.max(...xs)) / 2) * PX_TO_M;
    }, [allElems]);

    const centerZ = useMemo(() => {
        if (!allElems.length) return 0;
        const ys = allElems.map(p => p.y);
        return ((Math.min(...ys) + Math.max(...ys)) / 2) * PX_TO_M;
    }, [allElems]);

    // Sort floors ascending
    const sorted = useMemo(() => [...floors].sort((a, b) => a.floor - b.floor), [floors]);

    if (!allElems.length) return (
        <group>
            <Text position={[0, 1, 0]} fontSize={0.5} color="#64748b" anchorX="center">
                Çizime başlayın...
            </Text>
        </group>
    );


    return (
        <group>
            {sorted.map((f, fi) => {
                const xs = f.rooms.flatMap(r => [r.x, r.x + r.w]);
                const ys = f.rooms.flatMap(r => [r.y, r.y + r.h]);
                const minX = xs.length ? Math.min(...xs) : 0;
                const maxX = xs.length ? Math.max(...xs) : 0;
                const minZ = ys.length ? Math.min(...ys) : 0;
                const maxZ = ys.length ? Math.max(...ys) : 0;
                return (
                    <group key={f.floor}>
                        {fi > 0 && <Slab3D fi={fi} minX={minX} minZ={minZ} maxX={maxX} maxZ={maxZ} centerX={centerX} centerZ={centerZ} />}
                        {f.rooms.map(r => <Room3D key={r.id} room={r} fi={fi} centerX={centerX} centerZ={centerZ} />)}
                        {f.walls.map(w => <Wall3D key={w.id} wall={w} fi={fi} centerX={centerX} centerZ={centerZ} windows={f.windows} doors={f.doors} />)}
                        {f.columns.map(c => <Column3D key={c.id} col={c} fi={fi} centerX={centerX} centerZ={centerZ} />)}

                        {f.beams.map(b => <Beam3D key={b.id} beam={b} fi={fi} centerX={centerX} centerZ={centerZ} />)}
                        {f.windows.map(w => <Window3D key={w.id} win={w} fi={fi} centerX={centerX} centerZ={centerZ} />)}
                        {f.doors.map(d => <Door3D key={d.id} door={d} fi={fi} centerX={centerX} centerZ={centerZ} />)}



                        {/* Floor label */}
                        <Text
                            position={[0, fi * (FLOOR_H + SLAB_H) + FLOOR_H + 0.3, 0]}
                            fontSize={0.35} color="#94a3b8" anchorX="center"
                            billboard
                        >
                            {f.label}
                        </Text>
                    </group>
                );
            })}
            {/* Ground plane */}
            <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[60, 60]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
        </group>
    );
}

/* ─── Main Editor ────────────────────────────────────────────────── */
const FloorPlanEditor: React.FC<Props> = ({ isOpen, onClose, projectName }) => {
    const [floors, setFloors] = useState<FloorData[]>([
        { floor: 1, label: '1. Kat', rooms: [], walls: [], doors: [], windows: [], columns: [], beams: [], slabs: [] },
    ]);

    const [bgImage, setBgImage]     = useState<string | null>(null);
    const [dxfLines, setDxfLines]   = useState<{x1:number, y1:number, x2:number, y2:number}[]>([]);
    const [bgOpacity, setBgOpacity] = useState(0.4);

    const [bgScale,   setBgScale]   = useState(1.0);


    const [activeIdx, setActiveIdx] = useState(0);
    const [tool, setTool]           = useState<ToolType>('room');
    const [roomType, setRoomType]   = useState<RoomType>('salon');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [zoom, setZoom]           = useState(1);
    const [pan, setPan]             = useState({ x: 60, y: 40 });
    const [drawing, setDrawing]     = useState<{ x: number; y: number } | null>(null);
    const [cursor, setCursor]       = useState({ x: 0, y: 0 });
    const [viewMode, setViewMode]   = useState<'split' | '2d' | '3d'>('split');
    const [dragging, setDragging]   = useState<{ id: string; offX: number; offY: number } | null>(null);
    const [panDrag, setPanDrag]     = useState<{ sx: number; sy: number; sp: { x: number; y: number } } | null>(null);
    const [showDims, setShowDims]   = useState(true);
    const svgRef = useRef<SVGSVGElement>(null);



    const fd = floors[activeIdx];

    const update = useCallback((fn: (f: FloorData) => FloorData) => {
        setFloors(prev => prev.map((f, i) => i === activeIdx ? fn(f) : f));
    }, [activeIdx]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedId) {
                    update(f => ({
                        ...f,
                        rooms: f.rooms.filter(r => r.id !== selectedId),
                        walls: f.walls.filter(w => w.id !== selectedId),
                        doors: f.doors.filter(d => d.id !== selectedId),
                        windows: f.windows.filter(w => w.id !== selectedId),
                        columns: f.columns.filter(c => c.id !== selectedId)
                    }));

                    setSelectedId(null);
                }
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [selectedId, update]);

    const toSvg = (e: React.MouseEvent) => {
        const rect = svgRef.current!.getBoundingClientRect();
        return { x: (e.clientX - rect.left - pan.x) / zoom, y: (e.clientY - rect.top - pan.y) / zoom };
    };

    const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
        const l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
        if (l2 === 0) return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.sqrt(Math.pow(px - (x1 + t * (x2 - x1)), 2) + Math.pow(py - (y1 + t * (y2 - y1)), 2));
    };

    const hitRoom = (x: number, y: number) =>
        [...fd.rooms].reverse().find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);

    const hitWall = (x: number, y: number) =>
        fd.walls.find(w => distToSegment(x, y, w.x1, w.y1, w.x2, w.y2) < 10);

    const hitDoor = (x: number, y: number) =>
        fd.doors.find(d => x >= d.x - 5 && x <= d.x + d.w + 5 && y >= d.y - 15 && y <= d.y + 15);

    const hitWin = (x: number, y: number) =>
        fd.windows.find(w => x >= w.x - 5 && x <= w.x + w.w + 5 && y >= w.y - 15 && y <= w.y + 15);

    const hitCol = (x: number, y: number) =>
        fd.columns.find(c => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);

    /* Mouse events */
    const onDown = (e: React.MouseEvent) => {
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            setPanDrag({ sx: e.clientX, sy: e.clientY, sp: pan }); return;
        }
        if (e.button !== 0) return;
        const { x, y } = toSvg(e);
        if (tool === 'erase') {
            const hr = hitRoom(x, y);
            if (hr) { update(f => ({ ...f, rooms: f.rooms.filter(r => r.id !== hr.id) })); setSelectedId(null); return; }
            const hw = hitWall(x, y);
            if (hw) { update(f => ({ ...f, walls: f.walls.filter(w => w.id !== hw.id) })); setSelectedId(null); return; }
            const hd = hitDoor(x, y);
            if (hd) { update(f => ({ ...f, doors: f.doors.filter(d => d.id !== hd.id) })); setSelectedId(null); return; }
            const hwn = hitWin(x, y);
            if (hwn) { update(f => ({ ...f, windows: f.windows.filter(w => w.id !== hwn.id) })); setSelectedId(null); return; }
            const hc = hitCol(x, y);
            if (hc) { update(f => ({ ...f, columns: f.columns.filter(c => c.id !== hc.id) })); setSelectedId(null); return; }
            return;
        }
        if (tool === 'select') {
            const hr = hitRoom(x, y);
            if (hr) { setSelectedId(hr.id); setDragging({ id: hr.id, offX: x - hr.x, offY: y - hr.y }); return; }
            const hw = hitWall(x, y);
            if (hw) { setSelectedId(hw.id); return; }
            const hd = hitDoor(x, y);
            if (hd) { setSelectedId(hd.id); return; }
            const hwn = hitWin(x, y);
            if (hwn) { setSelectedId(hwn.id); return; }
            const hc = hitCol(x, y);
            if (hc) { setSelectedId(hc.id); return; }
            setSelectedId(null); return;
        }

        setDrawing({ x: snap(x), y: snap(y) });
    };

    const onMove = (e: React.MouseEvent) => {
        if (panDrag) { setPan({ x: panDrag.sp.x + e.clientX - panDrag.sx, y: panDrag.sp.y + e.clientY - panDrag.sy }); return; }
        const { x, y } = toSvg(e);
        setCursor({ x: snap(x), y: snap(y) });
        if (dragging) {
            const sx = snap(x - dragging.offX), sy = snap(y - dragging.offY);
            update(f => ({ ...f, rooms: f.rooms.map(r => r.id === dragging.id ? { ...r, x: sx, y: sy } : r) }));
        }
    };

    const onUp = (e: React.MouseEvent) => {
        if (panDrag) { setPanDrag(null); return; }
        setDragging(null);
        if (!drawing) return;
        const { x, y } = toSvg(e);
        const sx = snap(x), sy = snap(y);
        const x1 = Math.min(drawing.x, sx), y1 = Math.min(drawing.y, sy);
        const w = Math.abs(sx - drawing.x), h = Math.abs(sy - drawing.y);
        if (tool === 'room' && w >= GRID * 2 && h >= GRID * 2) {
            update(f => ({ ...f, rooms: [...f.rooms, { id: uid(), x: x1, y: y1, w, h, type: roomType, label: ROOM_LABELS[roomType] }] }));
        } else if (tool === 'wall' && (w > 2 || h > 2)) {
            update(f => ({ ...f, walls: [...f.walls, { id: uid(), x1: drawing.x, y1: drawing.y, x2: sx, y2: sy }] }));
        } else if (tool === 'door' && (w >= GRID || h >= GRID)) {
            // Snapping door
            let snappedX = x1 + w/2, snappedY = y1 + h/2;
            let bestWall: Wall | null = null, minDist = 40, wallAngle = 0;
            fd.walls.forEach(wa => {
                const d = distToSegment(snappedX, snappedY, wa.x1, wa.y1, wa.x2, wa.y2);
                if (d < minDist) { minDist = d; bestWall = wa; }
            });
            if (bestWall) {
                const wa = bestWall;
                const dx_w = wa.x2 - wa.x1, dy_w = wa.y2 - wa.y1;
                wallAngle = Math.atan2(dy_w, dx_w);
                const l2 = dx_w*dx_w + dy_w*dy_w;
                let t = ((snappedX - wa.x1) * dx_w + (snappedY - wa.y1) * dy_w) / l2;
                t = Math.max(0, Math.min(1, t));
                snappedX = wa.x1 + t * dx_w; snappedY = wa.y1 + t * dy_w;
            }
            update(f => ({ ...f, doors: [...f.doors, { id: uid(), x: snappedX, y: snappedY, w: Math.max(w, 40), angle: wallAngle }] }));

        } else if (tool === 'window' && (w >= GRID || h >= GRID)) {
            // Snapping window
            let snappedX = x1 + w/2, snappedY = y1 + h/2;
            let bestWall: Wall | null = null, minDist = 40, wallAngle = 0;
            let side: any = 'top';
            fd.walls.forEach(wa => {
                const d = distToSegment(snappedX, snappedY, wa.x1, wa.y1, wa.x2, wa.y2);
                if (d < minDist) { minDist = d; bestWall = wa; }
            });
            if (bestWall) {
                const wa = bestWall;
                const dx_w = wa.x2 - wa.x1, dy_w = wa.y2 - wa.y1;
                wallAngle = Math.atan2(dy_w, dx_w);
                const l2 = dx_w*dx_w + dy_w*dy_w;
                let t = ((snappedX - wa.x1) * dx_w + (snappedY - wa.y1) * dy_w) / l2;
                t = Math.max(0, Math.min(1, t));
                snappedX = wa.x1 + t * dx_w; snappedY = wa.y1 + t * dy_w;
                side = Math.abs(dx_w) > Math.abs(dy_w) ? 'top' : 'left';
            }
            update(f => ({ ...f, windows: [...f.windows, { id: uid(), x: snappedX, y: snappedY, w: Math.max(w, 60), h: 1.5, wallSide: side, angle: wallAngle }] }));


        } else if (tool === 'column') {
            update(f => ({ ...f, columns: [...f.columns, { id: uid(), x: x1, y: y1, w: Math.max(w, 20), h: Math.max(h, 20) }] }));
        }

        setDrawing(null);
    };

    const onWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        setZoom(z => Math.max(0.25, Math.min(5, z * (e.deltaY < 0 ? 1.12 : 0.89))));
    };

    const addFloor = (dir: 'up' | 'down') => {
        const nums = floors.map(f => f.floor);
        const n = dir === 'up' ? Math.max(...nums) + 1 : Math.min(...nums) - 1;
        const lbl = n < 0 ? `${Math.abs(n)}. Bodrum` : n === 0 ? 'Zemin' : `${n}. Kat`;
        setFloors(prev => {
            const updated = [...prev, { floor: n, label: lbl, rooms: [], walls: [], doors: [], windows: [], columns: [], beams: [], slabs: [] }]
                .sort((a, b) => a.floor - b.floor);

            setTimeout(() => setActiveIdx(updated.findIndex(f => f.floor === n)), 0);
            return updated;
        });
    };

    const copyFromBelow = () => {
        const src = floors.find(f => f.floor === fd.floor - 1);
        if (!src) return;
        update(f => ({ 
            ...f, 
            rooms: src.rooms.map(r => ({ ...r, id: uid() })), 
            walls: src.walls.map(w => ({ ...w, id: uid() })), 
            columns: src.columns.map(c => ({ ...c, id: uid() })),
            beams: src.beams.map(b => ({ ...b, id: uid() })),
            slabs: src.slabs.map(s => ({ ...s, id: uid() }))
        }));
    };


    const ghost = drawing ? {
        x: Math.min(drawing.x, cursor.x), y: Math.min(drawing.y, cursor.y),
        w: Math.abs(cursor.x - drawing.x), h: Math.abs(cursor.y - drawing.y),
    } : null;

    const m = (px: number) => `${(px * PX_TO_M).toFixed(1)}m`;

    if (!isOpen) return null;

    const show2D = viewMode !== '3d';
    const show3D = viewMode !== '2d';

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', flexDirection: 'column', background: '#0f172a' }}>

            {/* ── Top bar ── */}
            <div style={{ height: '46px', background: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 14px', flexShrink: 0, borderBottom: '1px solid #334155' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'white' }}>📐 Kat Planı Editörü</span>
                {projectName && <span style={{ fontSize: '12px', color: '#64748b' }}>— {projectName}</span>}
                <div style={{ flex: 1 }} />

                {/* View mode toggle */}
                <div style={{ display: 'flex', background: '#0f172a', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                    {(['2d', 'split', '3d'] as const).map(v => (
                        <button key={v} onClick={() => setViewMode(v)} style={{
                            background: viewMode === v ? '#3b82f6' : 'transparent',
                            color: viewMode === v ? 'white' : '#64748b',
                            border: 'none', borderRadius: '6px', padding: '4px 12px',
                            fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        }}>
                            {v === '2d' ? '2D Plan' : v === 'split' ? '⬡ Split' : '3D'}
                        </button>
                    ))}
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#94a3b8', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showDims} onChange={e => setShowDims(e.target.checked)} /> Ölçüler
                </label>
                <button onClick={() => { setZoom(1); setPan({ x: 60, y: 40 }); }} style={btnSm}>Sıfırla</button>
                <button onClick={onClose} style={{ ...btnSm, background: '#dc2626' }}>✕ Kapat</button>
            </div>

            {/* ── Floor tabs ── */}
            <div style={{ background: '#1e293b', display: 'flex', alignItems: 'center', gap: '3px', padding: '5px 10px', flexShrink: 0, overflowX: 'auto', borderBottom: '1px solid #334155' }}>
                {[...floors].sort((a, b) => b.floor - a.floor).map(f => {
                    const ri = floors.indexOf(f);
                    return (
                        <button key={f.floor} onClick={() => setActiveIdx(ri)} style={{
                            background: activeIdx === ri ? '#3b82f6' : '#334155',
                            color: 'white', border: 'none', borderRadius: '6px',
                            padding: '5px 14px', cursor: 'pointer', fontSize: '12px',
                            fontWeight: activeIdx === ri ? 700 : 400, whiteSpace: 'nowrap',
                        }}>
                            {f.label}
                            {f.rooms.length > 0 && <span style={{ marginLeft: '5px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', padding: '1px 6px', fontSize: '10px' }}>{f.rooms.length}</span>}
                        </button>
                    );
                })}
                <button onClick={() => addFloor('up')} style={{ ...btnSm, background: '#1d4ed8', marginLeft: '6px' }}>+ Üst Kat</button>
                <button onClick={() => addFloor('down')} style={{ ...btnSm, background: '#1d4ed8' }}>+ Alt Kat</button>
                <button onClick={copyFromBelow} style={{ ...btnSm, background: '#15803d' }}>↑ Alttan Kopyala</button>
                {floors.length > 1 && (
                    <button onClick={() => setFloors(prev => { const n = prev.filter((_, i) => i !== activeIdx); setActiveIdx(Math.max(0, activeIdx - 1)); return n; })} style={{ ...btnSm, background: '#991b1b' }}>🗑 Katı Sil</button>
                )}
            </div>

            {/* ── Content ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Left toolbar */}
                {show2D && (
                    <div style={{ width: '170px', background: '#0f172a', display: 'flex', flexDirection: 'column', gap: '3px', padding: '10px 8px', flexShrink: 0, overflowY: 'auto', borderRight: '1px solid #1e293b' }}>
                        <div style={sectionLabel}>ARAÇLAR</div>
                        {([
                            { t: 'select', icon: '↖', lbl: 'Seç / Taşı' },
                            { t: 'room',   icon: '⬜', lbl: 'Oda Çiz' },
                            { t: 'wall',   icon: '━',  lbl: 'Duvar Çiz' },
                            { t: 'column', icon: '■',  lbl: 'Kolon' },
                            { t: 'beam',   icon: '▬',  lbl: 'Kiriş' },
                            { t: 'slab',   icon: '⧉',  lbl: 'Döşeme' },
                            { t: 'door',   icon: '🚪', lbl: 'Kapı Ekle' },
                            { t: 'window', icon: '🪟', lbl: 'Pencere' },
                            { t: 'erase',  icon: '✕',  lbl: 'Sil' },


                        ] as { t: ToolType; icon: string; lbl: string }[]).map(({ t, icon, lbl }) => (
                            <button key={t} onClick={() => setTool(t)} style={{
                                background: tool === t ? '#3b82f6' : '#1e293b',
                                color: 'white', border: 'none', borderRadius: '8px',
                                padding: '9px 10px', cursor: 'pointer', textAlign: 'left',
                                fontSize: '12px', fontWeight: tool === t ? 700 : 400,
                                display: 'flex', alignItems: 'center', gap: '8px',
                            }}>
                                <span style={{ width: '16px', textAlign: 'center' }}>{icon}</span> {lbl}
                            </button>
                        ))}

                        {tool === 'room' && (
                            <>
                                <div style={{ ...sectionLabel, marginTop: '10px' }}>ODA TİPİ</div>
                                {(Object.entries(ROOM_LABELS) as [RoomType, string][]).map(([rt, lbl]) => (
                                    <button key={rt} onClick={() => setRoomType(rt)} style={{
                                        background: roomType === rt ? ROOM_FILL[rt] : '#1e293b',
                                        color: roomType === rt ? '#0f172a' : '#94a3b8',
                                        border: roomType === rt ? `2px solid ${ROOM_FILL[rt]}` : '2px solid transparent',
                                        borderRadius: '6px', padding: '5px 8px', cursor: 'pointer',
                                        textAlign: 'left', fontSize: '11px', fontWeight: roomType === rt ? 700 : 400,
                                    }}>
                                        {lbl}
                                    </button>
                                ))}
                        </>
                        )}

                        <div style={{ ...sectionLabel, marginTop: '10px' }}>ARKA PLAN (DXF/RESİM)</div>
                        <label style={{ background: '#334155', display: 'flex', justifyContent: 'center', cursor: 'pointer', padding: '6px', borderRadius: '4px', fontSize: '11px', color: 'white' }}>
                            📁 Plan Resmi Yükle
                            <input type="file" hidden accept="image/*" onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) {
                                    const reader = new FileReader();
                                    reader.onload = (re) => setBgImage(re.target?.result as string);
                                    reader.readAsDataURL(f);
                                }
                            }} />
                        </label>
                        {bgImage && (
                            <div style={{ padding: '5px' }}>
                                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>Şeffaflık</div>
                                <input type="range" min="0" max="1" step="0.1" value={bgOpacity} onChange={e => setBgOpacity(parseFloat(e.target.value))} style={{ width: '100%' }} />
                                
                                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '8px', marginBottom: '4px' }}>Plan Ölçeği</div>
                                <input type="range" min="0.1" max="5" step="0.05" value={bgScale} onChange={e => setBgScale(parseFloat(e.target.value))} style={{ width: '100%' }} />
                                <div style={{ fontSize: '9px', textAlign: 'right', color: '#64748b' }}>%{Math.round(bgScale*100)}</div>

                                <button onClick={() => { setBgImage(null); setDxfLines([]); }} style={{ background: '#991b1b', width: '100%', marginTop: '8px', border: 'none', color: 'white', padding: '4px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Planı Kaldır</button>
                            </div>
                        )}

                        <label style={{ background: '#1e3a8a', display: 'flex', justifyContent: 'center', cursor: 'pointer', padding: '6px', borderRadius: '4px', fontSize: '11px', color: 'white', marginTop: '10px' }}>
                            📐 DXF Yükle (AutoCAD)
                            <input type="file" hidden accept=".dxf,.dwg" onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) {
                                    if (f.name.toLowerCase().endsWith('.dwg')) {
                                        alert('⚠️ UYARI: .dwg dosyaları doğrudan okunamaz. \n\nLütfen AutoCAD içinde projenizi "Farklı Kaydet" (Save As) diyerek "DXF" formatında kaydedin ve o dosyayı yükleyin.');
                                        return;
                                    }
                                    const reader = new FileReader();
                                    reader.onload = (re) => {
                                        try {
                                            const parser = new DxfParser();
                                            const dxf = parser.parseSync(re.target?.result as string);
                                            const lines:any[] = [];
                                            dxf.entities.forEach(ent => {
                                                if (ent.type === 'LINE') {
                                                    const v = (ent as any).vertices;
                                                    if (v.length >= 2) lines.push({ x1: v[0].x, y1: -v[0].y, x2: v[1].x, y2: -v[1].y });
                                                } else if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
                                                    const v = (ent as any).vertices;
                                                    for (let i=0; i<v.length-1; i++) {
                                                        lines.push({ x1: v[i].x, y1: -v[i].y, x2: v[i+1].x, y2: -v[i+1].y });
                                                    }
                                                } else if (ent.type === 'CIRCLE') {
                                                    const c = ent as any;
                                                    const steps = 32;
                                                    for (let i=0; i<steps; i++) {
                                                        const a1 = (i / steps) * Math.PI * 2;
                                                        const a2 = ((i+1) / steps) * Math.PI * 2;
                                                        lines.push({
                                                            x1: c.center.x + Math.cos(a1) * c.radius, y1: -(c.center.y + Math.sin(a1) * c.radius),
                                                            x2: c.center.x + Math.cos(a2) * c.radius, y2: -(c.center.y + Math.sin(a2) * c.radius)
                                                        });
                                                    }
                                                }
                                            });

                                            if (lines.length > 0) {
                                                const xs = lines.flatMap(l => [l.x1, l.x2]);
                                                const ys = lines.flatMap(l => [l.y1, l.y2]);
                                                const minX = Math.min(...xs), minY = Math.min(...ys);
                                                const maxX = Math.max(...xs), maxY = Math.max(...ys);
                                                const dx = maxX - minX, dy = maxY - minY;
                                                const targetSize = 1200;
                                                const scale = targetSize / Math.max(dx, dy, 1);
                                                
                                                const normalized = lines.map(l => ({
                                                    x1: (l.x1 - minX) * scale + 100, y1: (l.y1 - minY) * scale + 100,
                                                    x2: (l.x2 - minX) * scale + 100, y2: (l.y2 - minY) * scale + 100
                                                }));
                                                setDxfLines(normalized);
                                                setBgScale(1.0);
                                            }
                                        } catch (err) { alert('DXF dosyası okunamadı. Lütfen geçerli bir DXF (v2000 veya üstü) yükleyin.'); }
                                    };
                                    reader.readAsText(f);
                                }
                            }} />
                        </label>
                        <div style={{ fontSize: '9px', color: '#64748b', textAlign: 'center', marginTop: '4px' }}>
                            * .dwg dosyalarını AutoCAD'de <b>.dxf</b> olarak kaydedip yükleyin.
                        </div>




                        <div style={{ ...sectionLabel, marginTop: '14px' }}>KISA YOLLAR</div>
                        <div style={{ fontSize: '10px', color: '#475569', lineHeight: 1.9 }}>
                            <div>Scroll → Zoom</div>
                            <div>Alt+Sürükle → Kaydır</div>
                            <div>Delete → Seçiliyi Sil</div>
                        </div>

                    </div>
                )}

                {/* ── 2D Canvas ── */}
                {show2D && (
                    <div style={{ flex: viewMode === '2d' ? 1 : '0 0 55%', position: 'relative', overflow: 'hidden', borderRight: viewMode === 'split' ? '2px solid #334155' : 'none' }}>
                        {/* Zoom indicator */}
                        <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(15,23,42,0.8)', color: '#64748b', padding: '3px 8px', borderRadius: '5px', fontSize: '11px', zIndex: 10 }}>
                            Zoom: {Math.round(zoom * 100)}% | X:{(cursor.x * PX_TO_M).toFixed(1)}m Y:{(cursor.y * PX_TO_M).toFixed(1)}m
                        </div>
                        {/* Legend */}
                        <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(15,23,42,0.9)', borderRadius: '8px', padding: '8px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {(Object.entries(ROOM_FILL) as [RoomType, string][]).map(([rt, c]) => (
                                <div key={rt} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#94a3b8' }}>
                                    <div style={{ width: '12px', height: '12px', background: c, borderRadius: '2px', flexShrink: 0 }} />
                                    {ROOM_LABELS[rt]}
                                </div>
                            ))}
                        </div>

                        <svg
                            ref={svgRef}
                            style={{ width: '100%', height: '100%', cursor: tool === 'select' ? 'default' : 'crosshair', userSelect: 'none', background: '#1e293b' }}
                            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onWheel={onWheel}
                        >
                            <defs>
                                <pattern id="g1" width={GRID * zoom} height={GRID * zoom} patternUnits="userSpaceOnUse"
                                    patternTransform={`translate(${pan.x % (GRID * zoom)},${pan.y % (GRID * zoom)})`}>
                                    <path d={`M ${GRID * zoom} 0 L 0 0 0 ${GRID * zoom}`} fill="none" stroke="rgba(100,116,139,0.18)" strokeWidth="0.6" />
                                </pattern>
                                <pattern id="g5" width={GRID * 5 * zoom} height={GRID * 5 * zoom} patternUnits="userSpaceOnUse"
                                    patternTransform={`translate(${pan.x % (GRID * 5 * zoom)},${pan.y % (GRID * 5 * zoom)})`}>
                                    <rect width={GRID * 5 * zoom} height={GRID * 5 * zoom} fill="url(#g1)" />
                                    <path d={`M ${GRID * 5 * zoom} 0 L 0 0 0 ${GRID * 5 * zoom}`} fill="none" stroke="rgba(100,116,139,0.35)" strokeWidth="1" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#g5)" />

                            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                                {/* Origin */}
                                <circle cx={0} cy={0} r={4 / zoom} fill="#3b82f6" />
                                <line x1={-12 / zoom} y1={0} x2={12 / zoom} y2={0} stroke="#3b82f6" strokeWidth={1 / zoom} />
                                <line x1={0} y1={-12 / zoom} x2={0} y2={12 / zoom} stroke="#3b82f6" strokeWidth={1 / zoom} />

                                {/* Background Tracer */}
                                {bgImage && (
                                    <image href={bgImage} opacity={bgOpacity} 
                                        style={{ pointerEvents: 'none', transform: `scale(${bgScale})`, transformOrigin: '0 0' }} 
                                    />
                                )}
                                {dxfLines.length > 0 && (
                                    <g opacity={bgOpacity} style={{ pointerEvents: 'none', transform: `scale(${bgScale})`, transformOrigin: '0 0' }}>
                                        {dxfLines.map((l, i) => (
                                            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#64748b" strokeWidth={1/zoom} />
                                        ))}
                                    </g>
                                )}



                                {/* Rooms are rendered first (bottom layer) */}

                                {fd.rooms.map(r => {
                                    const sel = selectedId === r.id;
                                    const m2 = (r.w * PX_TO_M * r.h * PX_TO_M).toFixed(1);
                                    return (
                                        <g key={r.id}>
                                            <rect x={r.x} y={r.y} width={r.w} height={r.h}
                                                fill={ROOM_FILL[r.type]}
                                                stroke={sel ? '#60a5fa' : '#334155'}
                                                strokeWidth={(sel ? 2.5 : 1.5) / zoom}
                                                style={{ cursor: tool === 'select' ? 'move' : 'default' }}
                                            />
                                            {/* Label */}
                                            <text x={r.x + r.w / 2} y={r.y + r.h / 2 - 8 / zoom}
                                                textAnchor="middle" fontSize={13 / zoom} fontWeight="700" fill="#0f172a"
                                                style={{ pointerEvents: 'none' }}>
                                                {r.label}
                                            </text>
                                            <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 10 / zoom}
                                                textAnchor="middle" fontSize={10 / zoom} fill="#334155"
                                                style={{ pointerEvents: 'none' }}>
                                                {m(r.w)} × {m(r.h)} = {m2}m²
                                            </text>
                                            {/* Dim lines when selected */}
                                            {sel && showDims && (
                                                <>
                                                    <line x1={r.x} y1={r.y - 16 / zoom} x2={r.x + r.w} y2={r.y - 16 / zoom} stroke="#60a5fa" strokeWidth={1 / zoom} />
                                                    <line x1={r.x} y1={r.y - 20 / zoom} x2={r.x} y2={r.y} stroke="#60a5fa" strokeWidth={0.7 / zoom} />
                                                    <line x1={r.x + r.w} y1={r.y - 20 / zoom} x2={r.x + r.w} y2={r.y} stroke="#60a5fa" strokeWidth={0.7 / zoom} />
                                                    <text x={r.x + r.w / 2} y={r.y - 20 / zoom} textAnchor="middle" fontSize={9 / zoom} fill="#60a5fa">{m(r.w)}</text>
                                                    <line x1={r.x + r.w + 16 / zoom} y1={r.y} x2={r.x + r.w + 16 / zoom} y2={r.y + r.h} stroke="#60a5fa" strokeWidth={1 / zoom} />
                                                    <text x={r.x + r.w + 22 / zoom} y={r.y + r.h / 2} fontSize={9 / zoom} fill="#60a5fa" dominantBaseline="middle">{m(r.h)}</text>
                                                </>
                                            )}
                                        </g>
                                    );
                                })}

                                {/* Walls are rendered on top of rooms */}
                                {fd.walls.map(w => {
                                    const len = Math.sqrt(Math.pow(w.x2 - w.x1, 2) + Math.pow(w.y2 - w.y1, 2));
                                    const sel = selectedId === w.id;
                                    return (
                                        <g key={w.id} style={{ cursor: tool === 'select' || tool === 'erase' ? 'pointer' : 'default' }}>
                                            <line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
                                                stroke={sel ? '#60a5fa' : (w.color || '#ffffff')} 
                                                strokeWidth={(sel ? 8 : 5) / zoom} strokeLinecap="round" />
                                            {!sel && <line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
                                                stroke="#1e293b" strokeWidth={1 / zoom} strokeLinecap="round" />}
                                            {showDims && len > 10 && (
                                                <text 
                                                    x={(w.x1 + w.x2) / 2} 
                                                    y={(w.y1 + w.y2) / 2 - 5 / zoom}
                                                    textAnchor="middle" fontSize={9 / zoom} fill="#fff" fontWeight="700"
                                                    style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: '#000', strokeWidth: 2 / zoom }}>
                                                    {m(len)}
                                                </text>
                                            )}
                                        </g>
                                    );
                                })}

                                {/* Columns */}
                                {fd.columns && fd.columns.map(c => {
                                    const sel = selectedId === c.id;
                                    return (
                                        <rect key={c.id}
                                            x={c.x} y={c.y} width={c.w} height={c.h}
                                            fill={c.color || "#1e293b"} 
                                            stroke={sel ? '#60a5fa' : '#3b82f6'}
                                            strokeWidth={(sel ? 3 : 1) / zoom}
                                            style={{ cursor: tool === 'select' || tool === 'erase' ? 'pointer' : 'default' }}
                                        />
                                    );
                                })}

                                {/* Beams */}
                                {fd.beams?.map(b => {
                                    const sel = selectedId === b.id;
                                    return (
                                        <line key={b.id} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
                                            stroke={sel ? '#60a5fa' : (b.color || '#94a3b8')}
                                            strokeWidth={8 / zoom} strokeDasharray={`${5 / zoom},${3 / zoom}`}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    );
                                })}



                                {/* Doors */}
                                {fd.doors.map(d => (
                                    <g key={d.id}>
                                        <rect x={d.x} y={d.y - 5 / zoom} width={d.w} height={10 / zoom} fill={d.color || "#92400e"} rx={2 / zoom} />
                                        <path d={`M ${d.x} ${d.y} Q ${d.x + d.w / 2} ${d.y - d.w / 2} ${d.x + d.w} ${d.y}`}
                                            fill="none" stroke={d.color || "#92400e"} strokeWidth={1 / zoom} strokeDasharray={`${4 / zoom},${3 / zoom}`} />
                                        <text x={d.x + d.w / 2} y={d.y + 14 / zoom} textAnchor="middle" fontSize={9 / zoom} fill={d.color || "#92400e"}>Kapı</text>
                                    </g>
                                ))}

                                {/* Windows */}
                                {fd.windows.map(w => (
                                    <g key={w.id}>
                                        <rect x={w.x} y={w.y - 6 / zoom} width={w.w} height={12 / zoom} fill={w.color || "#bae6fd"} stroke={w.color || "#0ea5e9"} strokeWidth={1.5 / zoom} />
                                        <line x1={w.x + w.w / 3} y1={w.y - 6 / zoom} x2={w.x + w.w / 3} y2={w.y + 6 / zoom} stroke={w.color || "#0ea5e9"} strokeWidth={0.8 / zoom} />
                                        <line x1={w.x + 2 * w.w / 3} y1={w.y - 6 / zoom} x2={w.x + 2 * w.w / 3} y2={w.y + 6 / zoom} stroke={w.color || "#0ea5e9"} strokeWidth={0.8 / zoom} />
                                        <text x={w.x + w.w / 2} y={w.y + 14 / zoom} textAnchor="middle" fontSize={9 / zoom} fill={w.color || "#0ea5e9"}>Pencere</text>
                                    </g>
                                ))}

                                {/* Ghost while drawing */}
                                {ghost && (tool === 'room' || tool === 'door' || tool === 'window') && (
                                    <g>
                                        <rect x={ghost.x} y={ghost.y} width={ghost.w} height={ghost.h}
                                            fill={tool === 'room' ? ROOM_FILL[roomType] : 'rgba(59,130,246,0.2)'}
                                            stroke="#3b82f6" strokeWidth={1.5 / zoom}
                                            strokeDasharray={`${5 / zoom},${3 / zoom}`} opacity={0.7} />
                                        {ghost.w > GRID && ghost.h > GRID && (
                                            <text x={ghost.x + ghost.w / 2} y={ghost.y + ghost.h / 2}
                                                textAnchor="middle" fontSize={11 / zoom} fill="#3b82f6" fontWeight="700"
                                                style={{ pointerEvents: 'none' }}>
                                                {m(ghost.w)} × {m(ghost.h)}
                                            </text>
                                        )}
                                    </g>
                                )}
                                {drawing && tool === 'wall' && (
                                    <g>
                                        <line x1={drawing.x} y1={drawing.y} x2={cursor.x} y2={cursor.y}
                                            stroke="#ffffff" strokeWidth={6 / zoom} strokeLinecap="round"
                                            strokeDasharray={`${8 / zoom},${4 / zoom}`} opacity={0.8} />
                                        {(() => {
                                            const len = Math.sqrt(Math.pow(cursor.x - drawing.x, 2) + Math.pow(cursor.y - drawing.y, 2));
                                            if (len > 5) {
                                                return (
                                                    <text 
                                                        x={(drawing.x + cursor.x) / 2} 
                                                        y={(drawing.y + cursor.y) / 2 - 10 / zoom}
                                                        textAnchor="middle" fontSize={11 / zoom} fill="#3b82f6" fontWeight="700"
                                                        style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: '#1e293b', strokeWidth: 3 / zoom }}>
                                                        {m(len)}
                                                    </text>
                                                );
                                            }
                                        })()}
                                    </g>
                                )}
                            </g>
                        </svg>
                    </div>
                )}

                {/* ── 3D View ── */}
                {show3D && (
                    <div style={{ flex: viewMode === '3d' ? 1 : '0 0 45%', position: 'relative', background: '#0a0f1a' }}>
                        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, background: 'rgba(15,23,42,0.85)', borderRadius: '8px', padding: '6px 12px', color: '#64748b', fontSize: '11px' }}>
                            🖱️ Sol sürükle: döndür &nbsp;|&nbsp; Sağ sürükle: kaydır &nbsp;|&nbsp; Scroll: zoom
                        </div>
                        {/* Stats */}
                        <div style={{ position: 'absolute', bottom: '10px', right: '10px', zIndex: 10, background: 'rgba(15,23,42,0.85)', borderRadius: '8px', padding: '8px 12px', color: '#94a3b8', fontSize: '11px' }}>
                            <div style={{ fontWeight: 700, color: '#60a5fa', marginBottom: '4px' }}>Bina Özeti</div>
                            {floors.map(f => (
                                <div key={f.floor}>{f.label}: {f.rooms.length} oda — {f.rooms.reduce((s, r) => s + r.w * PX_TO_M * r.h * PX_TO_M, 0).toFixed(0)}m²</div>
                            ))}
                            <div style={{ marginTop: '4px', fontSize: '12px', fontWeight: 700, color: '#34d399' }}>
                                TOPLAM: {floors.reduce((s, f) => s + f.rooms.reduce((ss, r) => ss + r.w * PX_TO_M * r.h * PX_TO_M, 0), 0).toFixed(0)}m²
                            </div>
                        </div>

                        <Canvas
                            shadows
                            camera={{ position: [18, 14, 20], fov: 45, near: 0.1, far: 1000 }}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <color attach="background" args={['#0a0f1a']} />
                            <ambientLight intensity={1.2} />
                            <directionalLight 
                                position={[20, 40, 20]} 
                                intensity={2.8} 
                                castShadow 
                                shadow-mapSize={[1024, 1024]}
                            />

                            <Building3DScene floors={floors} />
                            <OrbitControls enablePan enableZoom enableRotate makeDefault />
                        </Canvas>

                    </div>
                )}

                {/* Room list panel (only in 3D full mode) */}
                {viewMode === '3d' && (
                    <div style={{ width: '190px', background: '#0f172a', padding: '10px 8px', flexShrink: 0, overflowY: 'auto', borderLeft: '1px solid #1e293b' }}>
                        <div style={sectionLabel}>{fd.label.toUpperCase()} — ODALAR</div>
                        {fd.rooms.length === 0 && <p style={{ fontSize: '11px', color: '#475569' }}>Oda yok.<br />2D görünümde çizin.</p>}
                        {fd.rooms.map(r => (
                            <div key={r.id} style={{ background: '#1e293b', borderRadius: '8px', padding: '8px', marginBottom: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>{r.label}</div>
                                        <div style={{ fontSize: '10px', color: '#64748b' }}>{m(r.w)} × {m(r.h)}</div>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#34d399' }}>{(r.w * PX_TO_M * r.h * PX_TO_M).toFixed(1)}m²</div>
                                    </div>
                                    <div style={{ width: '12px', height: '12px', background: ROOM_3D[r.type], borderRadius: '3px', marginTop: '3px', flexShrink: 0 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {/* Properties Sidebar */}
                {selectedId && show2D && (
                    <PropertiesSidebar 
                        id={selectedId} 
                        fd={fd} 
                        update={update} 
                        onClose={() => setSelectedId(null)} 
                    />
                )}
            </div>

        </div>
    );
};

/* ─── Shared styles ────────────────────────────────────────────── */
const btnSm: React.CSSProperties = {
    background: '#334155', border: 'none', color: 'white',
    padding: '5px 11px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
};
const sectionLabel: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, color: '#475569',
    letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase' as const,
};

/* ─── Sidebar Component (Özellikler) ────────────────────────── */
const PropertiesSidebar = ({ id, fd, update, onClose }: any) => {
    const el =  fd.rooms.find((r:any) => r.id === id) || 
                fd.walls.find((w:any) => w.id === id) || 
                fd.doors.find((d:any) => d.id === id) || 
                fd.columns?.find((c:any) => c.id === id) ||
                fd.windows.find((w:any) => w.id === id);

    if (!el) return null;

    const isRoom = !!el.type;
    const isWall = !el.type && el.x1 !== undefined;
    const isCol  = !el.type && !el.x1 && el.h !== undefined && !el.wallSide;
    const isWin  = !!el.wallSide;
    const isDoor = !el.type && !el.x1 && el.w !== undefined && !el.h && !el.wallSide;

    const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: '4px', marginBottom: '12px' };
    const labelStyle = { fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' as const };
    const inputStyle = { background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '6px', borderRadius: '4px', fontSize: '13px', width: '100%' };

    return (
        <div style={{ width: '220px', background: '#0f172a', borderLeft: '1px solid #1e293b', padding: '15px', color: 'white', flexShrink: 0, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800 }}>{isRoom ? 'ODA AYARLARI' : isWall ? 'DUVAR AYARLARI' : isCol ? 'KOLON AYARLARI' : 'ELAMAN AYARLARI'}</div>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            {isRoom && (
                <div style={fieldStyle}>
                    <label style={labelStyle}>Oda Adı</label>
                    <input style={inputStyle} value={el.label} onChange={e => {
                        const val = e.target.value;
                        update((f:any) => ({ ...f, rooms: f.rooms.map((r:any) => r.id === id ? { ...r, label: val } : r) }));
                    }} />
                </div>
            )}

            {(isRoom || isCol) && (
                <>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Genişlik (cm)</label>
                        <input type="number" style={inputStyle} value={Math.round(el.w * 2.5)} onChange={e => {
                            const val = parseInt(e.target.value) / 2.5;
                            update((f:any) => ({
                                ...f,
                                rooms:   isRoom ? f.rooms.map((r:any) => r.id === id ? { ...r, w: val } : r) : f.rooms,
                                columns: isCol  ? f.columns.map((r:any) => r.id === id ? { ...r, w: val } : r) : f.columns
                            }));
                        }} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Derinlik (cm)</label>
                        <input type="number" style={inputStyle} value={Math.round(el.h * 2.5)} onChange={e => {
                            const val = parseInt(e.target.value) / 2.5;
                            update((f:any) => ({
                                ...f,
                                rooms:   isRoom ? f.rooms.map((r:any) => r.id === id ? { ...r, h: val } : r) : f.rooms,
                                columns: isCol  ? f.columns.map((r:any) => r.id === id ? { ...r, h: val } : r) : f.columns
                            }));
                        }} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Oda Yüksekliği (m)</label>
                        <input type="number" step="0.1" style={inputStyle} value={el.height ?? (isRoom && el.type === 'balkon' ? 1.05 : 3.0)} onChange={e => {
                            const val = parseFloat(e.target.value);
                            update((f:any) => ({
                                ...f,
                                rooms:   isRoom ? f.rooms.map((r:any) => r.id === id ? { ...r, height: val } : r) : f.rooms,
                            }));
                        }} />
                    </div>
                </>
            )}

            {isWall && (
                <>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Duvar Kalınlığı (cm)</label>
                        <input type="number" style={inputStyle} value={el.thickness || 15} onChange={e => {
                            const val = parseInt(e.target.value);
                            update((f:any) => ({ ...f, walls: f.walls.map((w:any) => w.id === id ? { ...w, thickness: val } : w) }));
                        }} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Duvar Yüksekliği (m)</label>
                        <input type="number" step="0.1" style={inputStyle} value={el.height ?? 3.0} onChange={e => {
                            const val = parseFloat(e.target.value);
                            update((f:any) => ({ ...f, walls: f.walls.map((w:any) => w.id === id ? { ...w, height: val } : w) }));
                        }} />
                    </div>
                </>
            )}


            {isWin && (
                <div style={fieldStyle}>
                    <label style={labelStyle}>Pencere Genişliği (cm)</label>
                    <input type="number" style={inputStyle} value={Math.round(el.w * 2.5)} onChange={e => {
                        const val = parseInt(e.target.value) / 2.5;
                        update((f:any) => ({ ...f, windows: f.windows.map((r:any) => r.id === id ? { ...r, w: val } : r) }));
                    }} />
                </div>
            )}
            
            {isDoor && (
                <div style={fieldStyle}>
                    <label style={labelStyle}>Kapı Genişliği (cm)</label>
                    <input type="number" style={inputStyle} value={Math.round(el.w * 2.5)} onChange={e => {
                        const val = parseInt(e.target.value) / 2.5;
                        update((f:any) => ({ ...f, doors: f.doors.map((r:any) => r.id === id ? { ...r, w: val } : r) }));
                    }} />
                </div>
            )}
            {(isWin || isDoor) && (
                <div style={fieldStyle}>
                    <label style={labelStyle}>Renk Seçimi</label>
                    <input type="color" style={{ ...inputStyle, height: '35px', padding: '2px' }} value={el.color || (isWin ? '#93c5fd' : '#78350f')} onChange={e => {
                        const val = e.target.value;
                        update((f:any) => ({
                            ...f,
                            doors:   isDoor ? f.doors.map((r:any) => r.id === id ? { ...r, color: val } : r) : f.doors,
                            windows: isWin  ? f.windows.map((r:any) => r.id === id ? { ...r, color: val } : r) : f.windows
                        }));
                    }} />
                </div>
            )}

            {(isWall || isCol) && (
                <div style={fieldStyle}>
                    <label style={labelStyle}>Renk Seçimi</label>
                    <input type="color" style={{ ...inputStyle, height: '35px', padding: '2px' }} value={el.color || (isCol ? '#1e293b' : '#64748b')} onChange={e => {
                        const val = e.target.value;
                        update((f:any) => ({
                            ...f,
                            walls:   isWall ? f.walls.map((r:any) => r.id === id ? { ...r, color: val } : r) : f.walls,
                            columns: isCol  ? f.columns.map((r:any) => r.id === id ? { ...r, color: val } : r) : f.columns
                        }));
                    }} />
                </div>
            )}

            <div style={{ marginTop: '20px', color: '#475569', fontSize: '10px' }}>
                ID: {id}<br/>
                Ölçek: 1px = 2.5cm
                <div style={{ marginTop: '10px', color: '#94a3b8' }}>* Değerleri değiştirmek için sayı kutularını kullanın.</div>
            </div>
        </div>
    );
};

export default FloorPlanEditor;

