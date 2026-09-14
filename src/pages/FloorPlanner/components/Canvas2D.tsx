import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FloorPlanData, Wall, Opening, FurnitureItem, Point, WallType } from '../types';
import { CatalogItem } from '../sampleData';

interface Canvas2DProps {
    planData: FloorPlanData;
    onChange: (newData: FloorPlanData) => void;
    activeTool: 'select' | 'wall' | 'door' | 'window' | 'pan';
    selectedCatalogItem: CatalogItem | null;
    onItemPlaced?: () => void;
    orthoMode?: boolean;
    activeWallType?: WallType;
}

const Canvas2D: React.FC<Canvas2DProps> = ({
    planData,
    onChange,
    activeTool,
    selectedCatalogItem,
    onItemPlaced,
    orthoMode = false,
    activeWallType = 'standard'
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Pan & Zoom
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 80 });
    const [scale, setScale] = useState<number>(50); // pixels per meter
    const [isPanning, setIsPanning] = useState(false);
    const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Wall Drawing
    const [wallStart, setWallStart] = useState<Point | null>(null);
    const [mouseWorldPos, setMouseWorldPos] = useState<Point>({ x: 0, y: 0 });
    const [shiftPressed, setShiftPressed] = useState<boolean>(false);
    const [customLengthInput, setCustomLengthInput] = useState<string>('');

    // Selection & Manipulation
    const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
    const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
    const [draggingVertex, setDraggingVertex] = useState<{ wallId: string; vertex: 'start' | 'end' } | null>(null);
    const [isDraggingFurniture, setIsDraggingFurniture] = useState(false);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Blueprint image cache
    const blueprintImgRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        if (planData.blueprint?.url) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = planData.blueprint.url;
            img.onload = () => {
                blueprintImgRef.current = img;
            };
        } else {
            blueprintImgRef.current = null;
        }
    }, [planData.blueprint?.url]);

    // Convert Screen to World (meters)
    const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
        return {
            x: (screenX - pan.x) / scale,
            y: (screenY - pan.y) / scale
        };
    }, [pan, scale]);

    // Convert World to Screen
    const worldToScreen = useCallback((worldX: number, worldY: number) => {
        return {
            x: worldX * scale + pan.x,
            y: worldY * scale + pan.y
        };
    }, [pan, scale]);

    // Snap to grid (10cm)
    const snap = (val: number, step = 0.1): number => {
        return Math.round(val / step) * step;
    };

    // Apply Ortho (90° / 0° locking) if orthoMode or Shift is active
    const applyOrtho = useCallback((start: Point, target: Point): Point => {
        const isOrtho = orthoMode || shiftPressed;
        if (!isOrtho) return target;

        const dx = Math.abs(target.x - start.x);
        const dy = Math.abs(target.y - start.y);
        if (dx > dy) {
            return { x: target.x, y: start.y };
        } else {
            return { x: start.x, y: target.y };
        }
    }, [orthoMode, shiftPressed]);

    // Render Canvas
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // ── 0. Blueprint Image Overlay (if loaded) ──
        if (blueprintImgRef.current && planData.blueprint) {
            ctx.save();
            ctx.globalAlpha = planData.blueprint.opacity || 0.45;
            const bpPos = worldToScreen(planData.blueprint.x, planData.blueprint.y);
            const bpScale = planData.blueprint.scale * scale;
            const img = blueprintImgRef.current;
            ctx.drawImage(img, bpPos.x, bpPos.y, img.width * bpScale, img.height * bpScale);
            ctx.restore();
        }

        // ── 1. Grid (Izgara) ──
        const gridSize = scale * 0.5; // 50cm
        const majorGridSize = scale * 1.0; // 1m

        ctx.lineWidth = 1;
        ctx.strokeStyle = '#f1f5f9';
        for (let x = (pan.x % gridSize); x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = (pan.y % gridSize); y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        ctx.strokeStyle = '#e2e8f0';
        for (let x = (pan.x % majorGridSize); x < canvas.width; x += majorGridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = (pan.y % majorGridSize); y < canvas.height; y += majorGridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Origin axes
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        const origin = worldToScreen(0, 0);
        ctx.beginPath();
        ctx.moveTo(origin.x, 0);
        ctx.lineTo(origin.x, canvas.height);
        ctx.moveTo(0, origin.y);
        ctx.lineTo(canvas.width, origin.y);
        ctx.stroke();

        // ── 2. Rooms (Odalar & Zeminler) ──
        planData.rooms.forEach(room => {
            if (room.points.length < 3) return;
            ctx.beginPath();
            const first = worldToScreen(room.points[0].x, room.points[0].y);
            ctx.moveTo(first.x, first.y);
            for (let i = 1; i < room.points.length; i++) {
                const pt = worldToScreen(room.points[i].x, room.points[i].y);
                ctx.lineTo(pt.x, pt.y);
            }
            ctx.closePath();

            if (room.floorType === 'parquet_light') {
                ctx.fillStyle = 'rgba(254, 243, 199, 0.45)';
            } else if (room.floorType === 'parquet_dark') {
                ctx.fillStyle = 'rgba(217, 119, 6, 0.15)';
            } else if (room.floorType === 'marble') {
                ctx.fillStyle = 'rgba(241, 245, 249, 0.7)';
            } else if (room.floorType === 'balcony_tile') {
                ctx.fillStyle = 'rgba(203, 213, 225, 0.35)';
            } else if (room.floorType === 'tile') {
                ctx.fillStyle = 'rgba(224, 242, 254, 0.4)';
            } else {
                ctx.fillStyle = 'rgba(248, 250, 252, 0.5)';
            }
            ctx.fill();

            const centerX = room.points.reduce((s, p) => s + p.x, 0) / room.points.length;
            const centerY = room.points.reduce((s, p) => s + p.y, 0) / room.points.length;
            const screenCenter = worldToScreen(centerX, centerY);

            ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#475569';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(room.name, screenCenter.x, screenCenter.y);
        });

        // ── 3. Columns (Taşıyıcı Betonarme Kolonlar) ──
        if (planData.columns && planData.columns.length > 0) {
            planData.columns.forEach((col, idx) => {
                const screenPos = worldToScreen(col.x, col.y);
                const cw = col.width * scale;
                const cd = col.depth * scale;

                ctx.save();
                ctx.translate(screenPos.x, screenPos.y);
                if (col.rotation) ctx.rotate((col.rotation * Math.PI) / 180);

                ctx.fillStyle = '#475569';
                ctx.fillRect(-cw / 2, -cd / 2, cw, cd);
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(-cw / 2, -cd / 2, cw, cd);

                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-cw / 2, -cd / 2);
                ctx.lineTo(cw / 2, cd / 2);
                ctx.moveTo(cw / 2, -cd / 2);
                ctx.lineTo(-cw / 2, cd / 2);
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`K${idx + 1}`, 0, 0);

                ctx.restore();
            });
        }

        // ── 4. Furniture (Mobilyalar) ──
        planData.furniture.forEach(item => {
            const screenPos = worldToScreen(item.x, item.y);
            const w = item.width * scale;
            const d = item.depth * scale;
            const isSelected = selectedFurnitureId === item.id;

            ctx.save();
            ctx.translate(screenPos.x, screenPos.y);
            ctx.rotate((item.rotation * Math.PI) / 180);

            ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 2;

            ctx.fillStyle = item.color || '#94a3b8';
            ctx.strokeStyle = isSelected ? '#3b82f6' : '#334155';
            ctx.lineWidth = isSelected ? 2.5 : 1.5;

            if (item.type === 'l_sofa') {
                ctx.beginPath();
                ctx.roundRect(-w / 2, -d / 2, w, d * 0.5, 4);
                ctx.roundRect(w / 2 - d * 0.5, -d / 2, d * 0.5, d, 4);
                ctx.fill();
                ctx.stroke();
            } else if (item.type.includes('bed')) {
                ctx.beginPath();
                ctx.roundRect(-w / 2, -d / 2, w, d, 4);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ffffff';
                if (item.width > 1.2) {
                    ctx.fillRect(-w / 2 + 6, -d / 2 + 6, w / 2 - 12, d * 0.25);
                    ctx.fillRect(6, -d / 2 + 6, w / 2 - 12, d * 0.25);
                } else {
                    ctx.fillRect(-w / 2 + 6, -d / 2 + 6, w - 12, d * 0.25);
                }
            } else if (item.type.includes('toilet')) {
                ctx.beginPath();
                ctx.roundRect(-w / 2, -d / 2, w, d * 0.35, 2);
                ctx.arc(0, d * 0.15, w * 0.42, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (item.type.includes('shower')) {
                ctx.beginPath();
                ctx.roundRect(-w / 2, -d / 2, w, d, 2);
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-w / 2, -d / 2);
                ctx.lineTo(w / 2, d / 2);
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.roundRect(-w / 2, -d / 2, w, d, 3);
                ctx.fill();
                ctx.stroke();
            }

            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px system-ui';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.name.split(' ')[0], 0, 0);

            if (isSelected) {
                ctx.strokeStyle = '#3b82f6';
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(-w / 2 - 5, -d / 2 - 5, w + 10, d + 10);
                ctx.setLineDash([]);

                ctx.beginPath();
                ctx.arc(0, -d / 2 - 16, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#3b82f6';
                ctx.fill();
                ctx.stroke();
            }

            ctx.restore();
        });

        // ── 5. Walls (Duvarlar & Özel Balkonlar) ──
        planData.walls.forEach(wall => {
            const start = worldToScreen(wall.start.x, wall.start.y);
            const end = worldToScreen(wall.end.x, wall.end.y);
            const thickness = (wall.thickness || 0.2) * scale;
            const isSelected = selectedWallId === wall.id;
            const wallType = wall.wallType || 'standard';

            const dx = wall.end.x - wall.start.x;
            const dy = wall.end.y - wall.start.y;
            const length = Math.hypot(dx, dy);

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.lineCap = 'square';

            if (wallType === 'balcony_glass') {
                ctx.lineWidth = thickness;
                ctx.strokeStyle = isSelected ? '#3b82f6' : 'rgba(56, 189, 248, 0.4)';
                ctx.stroke();

                ctx.lineWidth = 2;
                ctx.strokeStyle = '#0284c7';
                ctx.stroke();
            } else if (wallType === 'balcony_railing') {
                ctx.lineWidth = thickness;
                ctx.strokeStyle = isSelected ? '#3b82f6' : '#64748b';
                ctx.stroke();

                ctx.setLineDash([4, 4]);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#0f172a';
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (wallType === 'low_wall') {
                ctx.lineWidth = thickness;
                ctx.strokeStyle = isSelected ? '#3b82f6' : '#94a3b8';
                ctx.stroke();
            } else {
                ctx.lineWidth = thickness;
                ctx.strokeStyle = isSelected ? '#3b82f6' : (wall.thickness > 0.2 ? '#1e293b' : '#334155');
                ctx.stroke();

                ctx.lineWidth = 1;
                ctx.strokeStyle = '#0f172a';
                ctx.stroke();
            }

            // Dimension Label (4.50 m)
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            const angle = Math.atan2(end.y - start.y, end.x - start.x);

            ctx.save();
            ctx.translate(midX, midY);
            let textAngle = angle;
            if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
                textAngle += Math.PI;
            }
            ctx.rotate(textAngle);

            const offset = thickness / 2 + 12;
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const typePrefix = wallType === 'balcony_glass' ? '🪟 Cam: ' : wallType === 'balcony_railing' ? '⛓️ Korkuluk: ' : '';
            const dimText = `${typePrefix}${length.toFixed(2)} m`;
            const textWidth = ctx.measureText(dimText).width;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.fillRect(-textWidth / 2 - 4, -offset - 7, textWidth + 8, 14);
            ctx.strokeStyle = isSelected ? '#3b82f6' : '#cbd5e1';
            ctx.strokeRect(-textWidth / 2 - 4, -offset - 7, textWidth + 8, 14);

            ctx.fillStyle = isSelected ? '#1d4ed8' : '#0f172a';
            ctx.fillText(dimText, 0, -offset);
            ctx.restore();

            // ── Vertex Dragging Handles (when wall is selected) ──
            if (isSelected) {
                ctx.beginPath();
                ctx.arc(start.x, start.y, 7, 0, Math.PI * 2);
                ctx.fillStyle = '#3b82f6';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.5;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(end.x, end.y, 7, 0, Math.PI * 2);
                ctx.fillStyle = '#3b82f6';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }
        });

        // ── 6. Openings (Kapı & Pencereler) ──
        planData.openings.forEach(op => {
            const wall = planData.walls.find(w => w.id === op.wallId);
            if (!wall) return;

            const dx = wall.end.x - wall.start.x;
            const dy = wall.end.y - wall.start.y;
            const wallLength = Math.hypot(dx, dy);
            if (wallLength === 0) return;

            const posX = wall.start.x + dx * op.position;
            const posY = wall.start.y + dy * op.position;

            const screenPos = worldToScreen(posX, posY);
            const angle = Math.atan2(dy, dx);
            const w = op.width * scale;
            const thickness = (wall.thickness || 0.2) * scale;

            ctx.save();
            ctx.translate(screenPos.x, screenPos.y);
            ctx.rotate(angle);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-w / 2, -thickness / 2 - 1, w, thickness + 2);

            if (op.type === 'door') {
                ctx.strokeStyle = op.doorType === 'steel' ? '#0f172a' : '#b45309';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-w / 2, 0);
                ctx.lineTo(-w / 2, -w);
                ctx.stroke();

                ctx.setLineDash([3, 3]);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(-w / 2, 0, w, -Math.PI / 2, 0, false);
                ctx.stroke();
                ctx.setLineDash([]);
            } else {
                ctx.strokeStyle = '#0284c7';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(-w / 2, -thickness / 2, w, thickness);

                ctx.strokeStyle = '#38bdf8';
                ctx.beginPath();
                ctx.moveTo(-w / 2, 0);
                ctx.lineTo(w / 2, 0);
                ctx.stroke();
            }

            ctx.restore();
        });

        // ── 7. Live Wall Drawing Preview ──
        if (activeTool === 'wall' && wallStart) {
            const currentSnapped = applyOrtho(wallStart, { x: snap(mouseWorldPos.x), y: snap(mouseWorldPos.y) });
            const start = worldToScreen(wallStart.x, wallStart.y);
            const end = worldToScreen(currentSnapped.x, currentSnapped.y);
            const length = Math.hypot(currentSnapped.x - wallStart.x, currentSnapped.y - wallStart.y);

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.lineWidth = 0.2 * scale;
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.75)';
            ctx.stroke();

            ctx.font = 'bold 12px system-ui';
            ctx.fillStyle = '#1d4ed8';
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2 - 15;
            ctx.fillText(`${length.toFixed(2)} m ${(orthoMode || shiftPressed) ? '🔒 ORTHO' : ''}`, midX, midY);
        }

        // ── 8. Catalog Item Placement Preview ──
        if (selectedCatalogItem && activeTool === 'select') {
            const screenPos = worldToScreen(mouseWorldPos.x, mouseWorldPos.y);
            const w = selectedCatalogItem.width * scale;
            const d = selectedCatalogItem.depth * scale;

            ctx.save();
            ctx.translate(screenPos.x, screenPos.y);
            ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.fillRect(-w / 2, -d / 2, w, d);
            ctx.strokeRect(-w / 2, -d / 2, w, d);
            ctx.restore();
        }

    }, [planData, pan, scale, wallStart, mouseWorldPos, activeTool, selectedCatalogItem, selectedFurnitureId, selectedWallId, worldToScreen, applyOrtho, orthoMode, shiftPressed]);

    useEffect(() => {
        draw();
    }, [draw]);

    // Resize Observer
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => {
            const rect = canvas.parentElement?.getBoundingClientRect();
            if (rect) {
                canvas.width = rect.width;
                canvas.height = rect.height;
                draw();
            }
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [draw]);

    // Shift key tracking for instant Ortho lock
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            setShiftPressed(e.shiftKey);
        };
        window.addEventListener('keydown', handleKey);
        window.addEventListener('keyup', handleKey);
        return () => {
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('keyup', handleKey);
        };
    }, []);

    // Mouse Down
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const world = screenToWorld(screenX, screenY);

        if (e.button === 1 || activeTool === 'pan') {
            setIsPanning(true);
            setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            return;
        }

        // Wall Tool
        if (activeTool === 'wall') {
            if (!wallStart) {
                setWallStart({ x: snap(world.x), y: snap(world.y) });
            } else {
                const wallEnd = applyOrtho(wallStart, { x: snap(world.x), y: snap(world.y) });
                if (wallStart.x !== wallEnd.x || wallStart.y !== wallEnd.y) {
                    const newWall: Wall = {
                        id: 'w_' + Date.now(),
                        start: wallStart,
                        end: wallEnd,
                        thickness: activeWallType === 'balcony_glass' || activeWallType === 'balcony_railing' ? 0.15 : 0.20,
                        height: activeWallType === 'low_wall' ? 1.0 : 2.80,
                        wallType: activeWallType
                    };
                    onChange({
                        ...planData,
                        walls: [...planData.walls, newWall]
                    });
                }
                setWallStart(null);
            }
            return;
        }

        // Door or Window Tool
        if (activeTool === 'door' || activeTool === 'window') {
            let closestWall: Wall | null = null;
            let closestDist = Infinity;
            let closestRatio = 0.5;

            planData.walls.forEach(w => {
                const dx = w.end.x - w.start.x;
                const dy = w.end.y - w.start.y;
                const lenSq = dx * dx + dy * dy;
                if (lenSq === 0) return;

                const t = Math.max(0.1, Math.min(0.9, ((world.x - w.start.x) * dx + (world.y - w.start.y) * dy) / lenSq));
                const projX = w.start.x + t * dx;
                const projY = w.start.y + t * dy;
                const dist = Math.hypot(world.x - projX, world.y - projY);

                if (dist < closestDist && dist < 0.6) {
                    closestDist = dist;
                    closestWall = w;
                    closestRatio = t;
                }
            });

            if (closestWall) {
                const newOpening: Opening = {
                    id: 'op_' + Date.now(),
                    wallId: (closestWall as Wall).id,
                    type: activeTool === 'door' ? 'door' : 'window',
                    doorType: activeTool === 'door' ? 'standard' : undefined,
                    windowType: activeTool === 'window' ? 'standard' : undefined,
                    position: closestRatio,
                    width: activeTool === 'door' ? 0.90 : 1.40,
                    height: activeTool === 'door' ? 2.10 : 1.30,
                    sillHeight: activeTool === 'door' ? 0 : 0.90
                };
                onChange({
                    ...planData,
                    openings: [...planData.openings, newOpening]
                });
            }
            return;
        }

        // Select Tool
        if (activeTool === 'select') {
            if (selectedCatalogItem) {
                const newItem: FurnitureItem = {
                    id: 'f_' + Date.now(),
                    type: selectedCatalogItem.type,
                    category: selectedCatalogItem.category,
                    name: selectedCatalogItem.name,
                    x: snap(world.x),
                    y: snap(world.y),
                    rotation: 0,
                    width: selectedCatalogItem.width,
                    depth: selectedCatalogItem.depth,
                    height: selectedCatalogItem.height,
                    color: selectedCatalogItem.color,
                    icon: selectedCatalogItem.icon
                };
                onChange({
                    ...planData,
                    furniture: [...planData.furniture, newItem]
                });
                if (onItemPlaced) onItemPlaced();
                return;
            }

            // Check if clicked on a selected wall's vertex handle (Start or End)
            if (selectedWallId) {
                const selWall = planData.walls.find(w => w.id === selectedWallId);
                if (selWall) {
                    const startDist = Math.hypot(world.x - selWall.start.x, world.y - selWall.start.y);
                    const endDist = Math.hypot(world.x - selWall.end.x, world.y - selWall.end.y);
                    if (startDist <= 0.3) {
                        setDraggingVertex({ wallId: selWall.id, vertex: 'start' });
                        return;
                    } else if (endDist <= 0.3) {
                        setDraggingVertex({ wallId: selWall.id, vertex: 'end' });
                        return;
                    }
                }
            }

            // Check if clicked on furniture
            const clickedItem = [...planData.furniture].reverse().find(f => {
                const dx = Math.abs(world.x - f.x);
                const dy = Math.abs(world.y - f.y);
                return dx <= f.width / 2 + 0.1 && dy <= f.depth / 2 + 0.1;
            });

            if (clickedItem) {
                setSelectedFurnitureId(clickedItem.id);
                setSelectedWallId(null);
                setIsDraggingFurniture(true);
                setDragOffset({ x: world.x - clickedItem.x, y: world.y - clickedItem.y });
                return;
            }

            // Check if clicked on a wall
            const clickedWall = planData.walls.find(w => {
                const dx = w.end.x - w.start.x;
                const dy = w.end.y - w.start.y;
                const lenSq = dx * dx + dy * dy;
                if (lenSq === 0) return false;
                const t = Math.max(0, Math.min(1, ((world.x - w.start.x) * dx + (world.y - w.start.y) * dy) / lenSq));
                const projX = w.start.x + t * dx;
                const projY = w.start.y + t * dy;
                return Math.hypot(world.x - projX, world.y - projY) <= 0.25;
            });

            if (clickedWall) {
                setSelectedWallId(clickedWall.id);
                setSelectedFurnitureId(null);
            } else {
                setSelectedFurnitureId(null);
                setSelectedWallId(null);
            }
        }
    };

    // Mouse Move
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const world = screenToWorld(screenX, screenY);
        setMouseWorldPos(world);

        if (isPanning) {
            setPan({
                x: e.clientX - startPan.x,
                y: e.clientY - startPan.y
            });
            return;
        }

        // Dragging wall vertex endpoint
        if (draggingVertex) {
            const snappedWorld = { x: snap(world.x), y: snap(world.y) };
            const updatedWalls = planData.walls.map(w => {
                if (w.id === draggingVertex.wallId) {
                    if (draggingVertex.vertex === 'start') {
                        const newStart = applyOrtho(w.end, snappedWorld);
                        return { ...w, start: newStart };
                    } else {
                        const newEnd = applyOrtho(w.start, snappedWorld);
                        return { ...w, end: newEnd };
                    }
                }
                return w;
            });
            onChange({ ...planData, walls: updatedWalls });
            return;
        }

        // Dragging furniture
        if (isDraggingFurniture && selectedFurnitureId) {
            const updated = planData.furniture.map(f => {
                if (f.id === selectedFurnitureId) {
                    return {
                        ...f,
                        x: snap(world.x - dragOffset.x),
                        y: snap(world.y - dragOffset.y)
                    };
                }
                return f;
            });
            onChange({ ...planData, furniture: updated });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        setIsDraggingFurniture(false);
        setDraggingVertex(null);
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.max(15, Math.min(150, scale * zoomFactor));
        setScale(newScale);
    };

    // Manual Length Commit
    const commitManualWallLength = (lengthMeters: number) => {
        if (!wallStart || lengthMeters <= 0) return;
        const dx = mouseWorldPos.x - wallStart.x;
        const dy = mouseWorldPos.y - wallStart.y;
        const currentLen = Math.hypot(dx, dy) || 1;
        const dirX = dx / currentLen;
        const dirY = dy / currentLen;

        let endX = wallStart.x + dirX * lengthMeters;
        let endY = wallStart.y + dirY * lengthMeters;

        if (orthoMode || shiftPressed) {
            if (Math.abs(dx) > Math.abs(dy)) {
                endX = wallStart.x + (dx >= 0 ? lengthMeters : -lengthMeters);
                endY = wallStart.y;
            } else {
                endX = wallStart.x;
                endY = wallStart.y + (dy >= 0 ? lengthMeters : -lengthMeters);
            }
        }

        const newWall: Wall = {
            id: 'w_' + Date.now(),
            start: wallStart,
            end: { x: snap(endX), y: snap(endY) },
            thickness: activeWallType === 'balcony_glass' || activeWallType === 'balcony_railing' ? 0.15 : 0.20,
            height: activeWallType === 'low_wall' ? 1.0 : 2.80,
            wallType: activeWallType
        };

        onChange({
            ...planData,
            walls: [...planData.walls, newWall]
        });
        setWallStart(null);
        setCustomLengthInput('');
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedFurnitureId) {
                    onChange({
                        ...planData,
                        furniture: planData.furniture.filter(f => f.id !== selectedFurnitureId)
                    });
                    setSelectedFurnitureId(null);
                } else if (selectedWallId) {
                    onChange({
                        ...planData,
                        walls: planData.walls.filter(w => w.id !== selectedWallId),
                        openings: planData.openings.filter(o => o.wallId !== selectedWallId)
                    });
                    setSelectedWallId(null);
                }
            } else if (e.key === 'r' || e.key === 'R') {
                if (selectedFurnitureId) {
                    onChange({
                        ...planData,
                        furniture: planData.furniture.map(f =>
                            f.id === selectedFurnitureId ? { ...f, rotation: (f.rotation + 45) % 360 } : f
                        )
                    });
                }
            } else if (e.key === 'Escape') {
                setWallStart(null);
                setSelectedFurnitureId(null);
                setSelectedWallId(null);
                setDraggingVertex(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedFurnitureId, selectedWallId, planData, onChange]);

    const activeSelectedWall = planData.walls.find(w => w.id === selectedWallId);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#f8fafc', userSelect: 'none' }}>
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    cursor: activeTool === 'pan' || isPanning ? 'grab' : activeTool === 'wall' ? 'crosshair' : draggingVertex ? 'nwse-resize' : 'default'
                }}
            />

            {/* Live Wall Drawing HUD: Serbest Ölçü Girişi */}
            {activeTool === 'wall' && wallStart && (
                <div style={{
                    position: 'absolute',
                    top: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15, 23, 42, 0.92)',
                    backdropFilter: 'blur(8px)',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '30px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 20
                }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                        📏 Ölçü Gir:
                    </span>
                    <input
                        type="number"
                        step="0.05"
                        placeholder="Örn: 4.50"
                        value={customLengthInput}
                        onChange={(e) => setCustomLengthInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const val = parseFloat(customLengthInput);
                                if (!isNaN(val) && val > 0) commitManualWallLength(val);
                            }
                        }}
                        autoFocus
                        style={{
                            width: '80px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            fontWeight: 800,
                            borderRadius: '6px',
                            border: '1px solid #38bdf8',
                            background: '#0f172a',
                            color: '#ffffff',
                            textAlign: 'center'
                        }}
                    />
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>metre</span>
                    <button
                        onClick={() => {
                            const val = parseFloat(customLengthInput);
                            if (!isNaN(val) && val > 0) commitManualWallLength(val);
                        }}
                        style={{
                            padding: '4px 12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Uygula (Enter)
                    </button>
                    <button
                        onClick={() => setWallStart(null)}
                        style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: '#475569',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        İptal (Esc)
                    </button>
                </div>
            )}

            {/* Quick action bar for selected Wall */}
            {activeSelectedWall && (
                <div style={{
                    position: 'absolute',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 20
                }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b' }}>
                        🧱 Seçili Duvar: {Math.hypot(activeSelectedWall.end.x - activeSelectedWall.start.x, activeSelectedWall.end.y - activeSelectedWall.start.y).toFixed(2)} m
                    </span>

                    {/* Change Wall Type */}
                    <select
                        value={activeSelectedWall.wallType || 'standard'}
                        onChange={(e) => {
                            const newType = e.target.value as WallType;
                            onChange({
                                ...planData,
                                walls: planData.walls.map(w => w.id === activeSelectedWall.id ? { ...w, wallType: newType } : w)
                            });
                        }}
                        style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
                    >
                        <option value="standard">Standart Duvar (2.8m)</option>
                        <option value="balcony_glass">🪟 Cam Korkuluklu Balkon</option>
                        <option value="balcony_railing">⛓️ Ferforje Korkuluklu Balkon</option>
                        <option value="low_wall">🧱 Alçak Parapet (1.0m)</option>
                    </select>

                    <button
                        onClick={() => {
                            onChange({
                                ...planData,
                                walls: planData.walls.filter(w => w.id !== activeSelectedWall.id),
                                openings: planData.openings.filter(o => o.wallId !== activeSelectedWall.id)
                            });
                            setSelectedWallId(null);
                        }}
                        style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        🗑️ Sil (Del)
                    </button>
                </div>
            )}

            {/* Quick action bar for selected furniture */}
            {selectedFurnitureId && (
                <div style={{
                    position: 'absolute',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: '30px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    zIndex: 10
                }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                        {planData.furniture.find(f => f.id === selectedFurnitureId)?.name}
                    </span>
                    <button
                        onClick={() => {
                            onChange({
                                ...planData,
                                furniture: planData.furniture.map(f =>
                                    f.id === selectedFurnitureId ? { ...f, rotation: (f.rotation + 45) % 360 } : f
                                )
                            });
                        }}
                        style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        🔄 Döndür (R)
                    </button>
                    <button
                        onClick={() => {
                            onChange({
                                ...planData,
                                furniture: planData.furniture.filter(f => f.id !== selectedFurnitureId)
                            });
                            setSelectedFurnitureId(null);
                        }}
                        style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        🗑️ Sil (Del)
                    </button>
                </div>
            )}
        </div>
    );
};

export default Canvas2D;
