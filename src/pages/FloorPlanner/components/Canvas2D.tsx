import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FloorPlanData, Wall, Opening, Room, FurnitureItem, Point } from '../types';
import { CatalogItem } from '../sampleData';

interface Canvas2DProps {
    planData: FloorPlanData;
    onChange: (newData: FloorPlanData) => void;
    activeTool: 'select' | 'wall' | 'door' | 'window' | 'pan';
    selectedCatalogItem: CatalogItem | null;
    onItemPlaced?: () => void;
}

const Canvas2D: React.FC<Canvas2DProps> = ({
    planData,
    onChange,
    activeTool,
    selectedCatalogItem,
    onItemPlaced
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

    // Selection
    const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
    const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
    const [isDraggingFurniture, setIsDraggingFurniture] = useState(false);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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

    // Snap to grid (e.g. 0.1m / 10cm)
    const snap = (val: number, step = 0.1): number => {
        return Math.round(val / step) * step;
    };

    // Render Canvas
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // ── 1. Grid (Izgara) ──
        const gridSize = scale * 0.5; // 50cm minor grid
        const majorGridSize = scale * 1.0; // 1m major grid

        ctx.lineWidth = 1;
        ctx.strokeStyle = '#f1f5f9';
        // Minor grid
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

        // Major grid (1m)
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

            // Zemin renkleri
            if (room.floorType === 'parquet_light') {
                ctx.fillStyle = 'rgba(254, 243, 199, 0.45)'; // Amber/light wood
            } else if (room.floorType === 'parquet_dark') {
                ctx.fillStyle = 'rgba(217, 119, 6, 0.15)';
            } else if (room.floorType === 'marble') {
                ctx.fillStyle = 'rgba(241, 245, 249, 0.7)'; // Light grey marble
            } else if (room.floorType === 'tile') {
                ctx.fillStyle = 'rgba(224, 242, 254, 0.4)'; // Soft blue tile
            } else {
                ctx.fillStyle = 'rgba(248, 250, 252, 0.5)';
            }
            ctx.fill();

            // Oda İsmi ve Alanı
            const centerX = room.points.reduce((s, p) => s + p.x, 0) / room.points.length;
            const centerY = room.points.reduce((s, p) => s + p.y, 0) / room.points.length;
            const screenCenter = worldToScreen(centerX, centerY);

            ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#475569';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(room.name, screenCenter.x, screenCenter.y);
        });

        // ── 3. Furniture (Mobilyalar & Tefrişat) ──
        planData.furniture.forEach(item => {
            const screenPos = worldToScreen(item.x, item.y);
            const w = item.width * scale;
            const d = item.depth * scale;
            const isSelected = selectedFurnitureId === item.id;

            ctx.save();
            ctx.translate(screenPos.x, screenPos.y);
            ctx.rotate((item.rotation * Math.PI) / 180);

            // Furniture Shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 2;

            // Furniture Body
            ctx.fillStyle = item.color || '#94a3b8';
            ctx.strokeStyle = isSelected ? '#3b82f6' : '#334155';
            ctx.lineWidth = isSelected ? 2.5 : 1.5;

            // Type-specific drawing for professional architectural look
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
                // Pillows
                ctx.fillStyle = '#ffffff';
                if (item.width > 1.2) {
                    // Double bed 2 pillows
                    ctx.fillRect(-w / 2 + 6, -d / 2 + 6, w / 2 - 12, d * 0.25);
                    ctx.fillRect(6, -d / 2 + 6, w / 2 - 12, d * 0.25);
                } else {
                    ctx.fillRect(-w / 2 + 6, -d / 2 + 6, w - 12, d * 0.25);
                }
            } else if (item.type.includes('toilet')) {
                // Toilet bowl + tank
                ctx.beginPath();
                ctx.roundRect(-w / 2, -d / 2, w, d * 0.35, 2); // Tank
                ctx.arc(0, d * 0.15, w * 0.42, 0, Math.PI * 2); // Bowl
                ctx.fill();
                ctx.stroke();
            } else if (item.type.includes('shower')) {
                // Shower cabin with diagonal line
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

            // Label & Icon
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px system-ui';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.name.split(' ')[0], 0, 0);

            // Selection Outline & Controls
            if (isSelected) {
                ctx.strokeStyle = '#3b82f6';
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(-w / 2 - 5, -d / 2 - 5, w + 10, d + 10);
                ctx.setLineDash([]);

                // Rotation handle
                ctx.beginPath();
                ctx.arc(0, -d / 2 - 16, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#3b82f6';
                ctx.fill();
                ctx.stroke();
            }

            ctx.restore();
        });

        // ── 4. Walls (Duvarlar) ──
        planData.walls.forEach(wall => {
            const start = worldToScreen(wall.start.x, wall.start.y);
            const end = worldToScreen(wall.end.x, wall.end.y);
            const thickness = (wall.thickness || 0.2) * scale;
            const isSelected = selectedWallId === wall.id;

            // Calculate length in meters
            const dx = wall.end.x - wall.start.x;
            const dy = wall.end.y - wall.start.y;
            const length = Math.hypot(dx, dy);

            // Wall line
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.lineWidth = thickness;
            ctx.lineCap = 'square';
            ctx.strokeStyle = isSelected ? '#3b82f6' : (wall.thickness > 0.2 ? '#1e293b' : '#334155');
            ctx.stroke();

            // Wall core line
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#0f172a';
            ctx.stroke();

            // Dimension Label (Ölçü Metni: 4.20 m)
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            const angle = Math.atan2(end.y - start.y, end.x - start.x);

            ctx.save();
            ctx.translate(midX, midY);
            // Keep text readable (not upside down)
            let textAngle = angle;
            if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
                textAngle += Math.PI;
            }
            ctx.rotate(textAngle);

            const offset = thickness / 2 + 12;
            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = '#475569';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Background pill for dimension
            const dimText = `${length.toFixed(2)} m`;
            const textWidth = ctx.measureText(dimText).width;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(-textWidth / 2 - 3, -offset - 7, textWidth + 6, 14);
            ctx.strokeStyle = '#cbd5e1';
            ctx.strokeRect(-textWidth / 2 - 3, -offset - 7, textWidth + 6, 14);

            ctx.fillStyle = '#0f172a';
            ctx.fillText(dimText, 0, -offset);
            ctx.restore();
        });

        // ── 5. Openings (Kapı & Pencereler) ──
        planData.openings.forEach(op => {
            const wall = planData.walls.find(w => w.id === op.wallId);
            if (!wall) return;

            const dx = wall.end.x - wall.start.x;
            const dy = wall.end.y - wall.start.y;
            const wallLength = Math.hypot(dx, dy);
            if (wallLength === 0) return;

            // Center position along the wall
            const posX = wall.start.x + dx * op.position;
            const posY = wall.start.y + dy * op.position;

            const screenPos = worldToScreen(posX, posY);
            const angle = Math.atan2(dy, dx);
            const w = op.width * scale;
            const thickness = (wall.thickness || 0.2) * scale;

            ctx.save();
            ctx.translate(screenPos.x, screenPos.y);
            ctx.rotate(angle);

            // Clear wall opening (cutout)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-w / 2, -thickness / 2 - 1, w, thickness + 2);

            if (op.type === 'door') {
                // Architectural swing door
                ctx.strokeStyle = '#b45309';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-w / 2, 0);
                ctx.lineTo(-w / 2, -w);
                ctx.stroke();

                // Swing arc
                ctx.setLineDash([3, 3]);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(-w / 2, 0, w, -Math.PI / 2, 0, false);
                ctx.stroke();
                ctx.setLineDash([]);
            } else {
                // Architectural Window (3 parallel glass lines)
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

        // ── 6. Live Drawing Preview (Yeni Duvar Çizerken) ──
        if (activeTool === 'wall' && wallStart) {
            const start = worldToScreen(wallStart.x, wallStart.y);
            const end = worldToScreen(mouseWorldPos.x, mouseWorldPos.y);
            const length = Math.hypot(mouseWorldPos.x - wallStart.x, mouseWorldPos.y - wallStart.y);

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.lineWidth = 0.2 * scale;
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
            ctx.stroke();

            // Live Dimension Tag
            ctx.font = 'bold 12px system-ui';
            ctx.fillStyle = '#2563eb';
            ctx.fillText(`${length.toFixed(2)} m`, (start.x + end.x) / 2, (start.y + end.y) / 2 - 15);
        }

        // ── 7. Catalog Item Placement Preview ──
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

    }, [planData, pan, scale, wallStart, mouseWorldPos, activeTool, selectedCatalogItem, selectedFurnitureId, selectedWallId, worldToScreen]);

    // Handle Animation Frame
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

    // Mouse Event Handlers
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const world = screenToWorld(screenX, screenY);

        // Middle Click or Pan Tool -> Start Panning
        if (e.button === 1 || activeTool === 'pan') {
            setIsPanning(true);
            setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            return;
        }

        // Wall Tool -> Start or Finish Wall
        if (activeTool === 'wall') {
            if (!wallStart) {
                setWallStart({ x: snap(world.x), y: snap(world.y) });
            } else {
                const wallEnd = { x: snap(world.x), y: snap(world.y) };
                if (wallStart.x !== wallEnd.x || wallStart.y !== wallEnd.y) {
                    const newWall: Wall = {
                        id: 'w_' + Date.now(),
                        start: wallStart,
                        end: wallEnd,
                        thickness: 0.20,
                        height: 2.80
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

        // Door or Window Tool -> Place on closest wall
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

        // Select Tool -> Catalog item placement or select furniture/wall
        if (activeTool === 'select') {
            if (selectedCatalogItem) {
                // Place furniture from catalog
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

            // Check if clicked on existing furniture
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
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.max(15, Math.min(150, scale * zoomFactor));
        setScale(newScale);
    };

    // Keyboard Shortcuts (Delete, Rotate, Escape)
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
                // Rotate 45 or 90 degrees
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
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedFurnitureId, selectedWallId, planData, onChange]);

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
                    cursor: activeTool === 'pan' || isPanning ? 'grab' : activeTool === 'wall' ? 'crosshair' : 'default'
                }}
            />

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
