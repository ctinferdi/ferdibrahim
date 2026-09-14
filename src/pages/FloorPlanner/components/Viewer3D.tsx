import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FloorPlanData, Room, Wall, Opening } from '../types';
import { createFurniture3D } from '../furniture3D';

interface Viewer3DProps {
    planData: FloorPlanData;
    viewMode: 'orbit' | 'walk';
    onToggleViewMode: (mode: 'orbit' | 'walk') => void;
}

// Generate procedural realistic parquet texture
function createParquetTexture(type: 'light' | 'dark' = 'light'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base wood color
    ctx.fillStyle = type === 'light' ? '#f5e6ca' : '#78350f';
    ctx.fillRect(0, 0, 512, 512);

    // Plank lines
    const plankHeight = 32;
    const plankWidth = 128;

    ctx.strokeStyle = type === 'light' ? '#e2cead' : '#592506';
    ctx.lineWidth = 1.5;

    for (let y = 0; y < 512; y += plankHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();

        const offset = (y / plankHeight) % 2 === 0 ? 0 : plankWidth / 2;
        for (let x = -plankWidth + offset; x < 512 + plankWidth; x += plankWidth) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + plankHeight);
            ctx.stroke();

            // Subtle wood grain variation
            ctx.fillStyle = type === 'light' 
                ? `rgba(220, 195, 155, ${Math.random() * 0.15})` 
                : `rgba(40, 15, 5, ${Math.random() * 0.2})`;
            ctx.fillRect(x, y, plankWidth, plankHeight);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
}

// Generate procedural marble tile texture
function createMarbleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle veins
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * 512, 0);
        ctx.bezierCurveTo(
            Math.random() * 512, 170,
            Math.random() * 512, 340,
            Math.random() * 512, 512
        );
        ctx.stroke();
    }

    // Grid tile joints
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 128) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    return texture;
}

const Viewer3D: React.FC<Viewer3DProps> = ({
    planData,
    viewMode,
    onToggleViewMode
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const orbitControlsRef = useRef<OrbitControls | null>(null);

    // First Person Walk State
    const walkPosRef = useRef<THREE.Vector3>(new THREE.Vector3(5, 1.65, 4));
    const walkAngleRef = useRef<{ yaw: number; pitch: number }>({ yaw: 0, pitch: 0 });
    const keysPressedRef = useRef<{ [key: string]: boolean }>({});
    const isMouseDownRef = useRef<boolean>(false);
    const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // Scene Initialization
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // 1. Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.background = new THREE.Color(0xf1f5f9);

        // 2. Camera
        const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 1000);
        cameraRef.current = camera;
        camera.position.set(5.5, 14, 13);

        // 3. Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        rendererRef.current = renderer;
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;

        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        // 4. Orbit Controls
        const orbit = new OrbitControls(camera, renderer.domElement);
        orbitControlsRef.current = orbit;
        orbit.enableDamping = true;
        orbit.dampingFactor = 0.08;
        orbit.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go under floor
        orbit.target.set(5.5, 0, 4);

        // 5. Lighting
        // Ambient Light
        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambient);

        // Hemisphere Light (sky / ground)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.6);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        // Sun Directional Light
        const sun = new THREE.DirectionalLight(0xfffbeb, 1.4);
        sun.position.set(16, 25, 18);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 60;
        const d = 15;
        sun.shadow.camera.left = -d;
        sun.shadow.camera.right = d;
        sun.shadow.camera.top = d;
        sun.shadow.camera.bottom = -d;
        sun.shadow.bias = -0.0005;
        scene.add(sun);

        // Interior Spotlights for cozy architectural feel
        const interiorLight1 = new THREE.PointLight(0xfef3c7, 0.8, 12);
        interiorLight1.position.set(8.5, 2.5, 3.0); // Salon
        scene.add(interiorLight1);

        const interiorLight2 = new THREE.PointLight(0xfef3c7, 0.8, 10);
        interiorLight2.position.set(2.0, 2.5, 6.5); // Master bedroom
        scene.add(interiorLight2);

        // Outdoor Ground Plane (Slightly larger ground)
        const groundGeo = new THREE.PlaneGeometry(80, 80);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01;
        ground.receiveShadow = true;
        scene.add(ground);

        // 6. Animation Loop
        let animationFrameId: number;
        const clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const delta = clock.getDelta();

            if (viewMode === 'orbit') {
                orbit.enabled = true;
                orbit.update();
            } else {
                // First Person Walkthrough Controls
                orbit.enabled = false;

                const speed = 3.5 * delta;
                const yaw = walkAngleRef.current.yaw;
                const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
                const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

                const keys = keysPressedRef.current;
                if (keys['w'] || keys['W'] || keys['ArrowUp']) {
                    walkPosRef.current.addScaledVector(forward, speed);
                }
                if (keys['s'] || keys['S'] || keys['ArrowDown']) {
                    walkPosRef.current.addScaledVector(forward, -speed);
                }
                if (keys['a'] || keys['A'] || keys['ArrowLeft']) {
                    walkPosRef.current.addScaledVector(right, -speed);
                }
                if (keys['d'] || keys['D'] || keys['ArrowRight']) {
                    walkPosRef.current.addScaledVector(right, speed);
                }

                // Keep camera at realistic eye-level (1.65m)
                camera.position.set(
                    walkPosRef.current.x,
                    1.65,
                    walkPosRef.current.z
                );

                // Look Direction
                const pitch = Math.max(-1.2, Math.min(1.2, walkAngleRef.current.pitch));
                const target = new THREE.Vector3(
                    camera.position.x - Math.sin(yaw) * Math.cos(pitch),
                    camera.position.y + Math.sin(pitch),
                    camera.position.z - Math.cos(yaw) * Math.cos(pitch)
                );
                camera.lookAt(target);
            }

            renderer.render(scene, camera);
        };

        animate();

        // Resize Listener
        const handleResize = () => {
            if (!container) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
        };
    }, [viewMode]);

    // Build 3D Building (Walls, Openings, Rooms, Furniture)
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;

        // Remove existing dynamic objects group
        const existingGroup = scene.getObjectByName('floorPlanDynamicGroup');
        if (existingGroup) scene.remove(existingGroup);

        const dynamicGroup = new THREE.Group();
        dynamicGroup.name = 'floorPlanDynamicGroup';

        // ── 1. Materials ──
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.85,
            metalness: 0.05
        });

        const wallCapMaterial = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            roughness: 0.7
        });

        const doorWoodMat = new THREE.MeshStandardMaterial({
            color: 0xb45309,
            roughness: 0.5
        });

        const windowFrameMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.3
        });

        const windowGlassMat = new THREE.MeshPhysicalMaterial({
            color: 0xbae6fd,
            transparent: true,
            opacity: 0.35,
            roughness: 0.05,
            transmission: 0.9,
            ior: 1.52
        });

        const parquetLightMat = new THREE.MeshStandardMaterial({
            map: createParquetTexture('light'),
            roughness: 0.45,
            metalness: 0.05
        });

        const balconyTileMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            roughness: 0.6,
            metalness: 0.1
        });

        const railingMetalMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.35,
            metalness: 0.85
        });

        const steelDoorMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.4,
            metalness: 0.6
        });

        const chromeMat = new THREE.MeshStandardMaterial({
            color: 0xf1f5f9,
            roughness: 0.15,
            metalness: 0.95
        });

        const roofTileMat = new THREE.MeshStandardMaterial({
            color: 0x9a3412, // Terracotta tile roof
            roughness: 0.7,
            metalness: 0.05
        });

        // ── 2. Build Rooms (Floors) ──
        planData.rooms.forEach(room => {
            if (room.points.length < 3) return;

            const shape = new THREE.Shape();
            shape.moveTo(room.points[0].x, room.points[0].y);
            for (let i = 1; i < room.points.length; i++) {
                shape.lineTo(room.points[i].x, room.points[i].y);
            }
            shape.closePath();

            const floorGeo = new THREE.ShapeGeometry(shape);
            let mat = parquetLightMat;
            if (room.floorType === 'marble') mat = marbleMat;
            else if (room.floorType === 'balcony_tile') mat = balconyTileMat;
            else if (room.floorType === 'tile') mat = marbleMat;
            else if (room.floorType === 'parquet_dark') mat = parquetLightMat;

            const floorMesh = new THREE.Mesh(floorGeo, mat);
            floorMesh.rotation.x = Math.PI / 2;
            floorMesh.position.y = 0.005;
            floorMesh.receiveShadow = true;
            dynamicGroup.add(floorMesh);
        });

        // ── 3. Build Columns (Taşıyıcı Betonarme Kolonlar) ──
        if (planData.columns && planData.columns.length > 0) {
            planData.columns.forEach(col => {
                const colH = col.height || 2.80;
                const colGeo = new THREE.BoxGeometry(col.width, colH, col.depth);
                const colMesh = new THREE.Mesh(colGeo, wallCapMaterial);
                colMesh.position.set(col.x, colH / 2, col.y);
                if (col.rotation) colMesh.rotation.y = -(col.rotation * Math.PI) / 180;
                colMesh.castShadow = true;
                colMesh.receiveShadow = true;
                dynamicGroup.add(colMesh);
            });
        }

        // ── 4. Build Walls with Openings & Balcony Types ──
        planData.walls.forEach(wall => {
            const dx = wall.end.x - wall.start.x;
            const dy = wall.end.y - wall.start.y;
            const length = Math.hypot(dx, dy);
            if (length === 0) return;

            const thickness = wall.thickness || 0.20;
            const angle = Math.atan2(dy, dx);
            const wallType = wall.wallType || 'standard';

            // ── Özel Balkon Tipi: Cam Korkuluklu Balkon (balcony_glass) ──
            if (wallType === 'balcony_glass') {
                const curbH = 0.35; // Alt beton parapet
                const glassH = 0.70; // Üst cam panel
                const handrailH = 0.05;

                // Parapet kaidesi
                const curbGeo = new THREE.BoxGeometry(length, curbH, thickness);
                const curbMesh = new THREE.Mesh(curbGeo, wallMaterial);
                curbMesh.position.set((wall.start.x + wall.end.x) / 2, curbH / 2, (wall.start.y + wall.end.y) / 2);
                curbMesh.rotation.y = -angle;
                curbMesh.castShadow = true;
                dynamicGroup.add(curbMesh);

                // Cam Panel
                const glassGeo = new THREE.BoxGeometry(length - 0.04, glassH, 0.02);
                const glassMesh = new THREE.Mesh(glassGeo, windowGlassMat);
                glassMesh.position.set((wall.start.x + wall.end.x) / 2, curbH + glassH / 2, (wall.start.y + wall.end.y) / 2);
                glassMesh.rotation.y = -angle;
                dynamicGroup.add(glassMesh);

                // Üst Küpeşte (Chrome/Alüminyum El Tutamağı)
                const railGeo = new THREE.BoxGeometry(length, handrailH, 0.06);
                const railMesh = new THREE.Mesh(railGeo, chromeMat);
                railMesh.position.set((wall.start.x + wall.end.x) / 2, curbH + glassH + handrailH / 2, (wall.start.y + wall.end.y) / 2);
                railMesh.rotation.y = -angle;
                dynamicGroup.add(railMesh);

                // Paslanmaz çelik dikmeler (her 1.2 metrede bir)
                const posts = Math.max(2, Math.round(length / 1.2));
                for (let i = 0; i <= posts; i++) {
                    const postRatio = i / posts;
                    const postMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, glassH + handrailH, 8), chromeMat);
                    const px = wall.start.x + (dx * postRatio);
                    const py = wall.start.y + (dy * postRatio);
                    postMesh.position.set(px, curbH + (glassH + handrailH) / 2, py);
                    dynamicGroup.add(postMesh);
                }
                return;
            }

            // ── Özel Balkon Tipi: Ferforje Demir Korkuluk (balcony_railing) ──
            if (wallType === 'balcony_railing') {
                const curbH = 0.15;
                const railingH = 0.90;

                // Minik beton hatıl
                const curbGeo = new THREE.BoxGeometry(length, curbH, thickness);
                const curbMesh = new THREE.Mesh(curbGeo, wallMaterial);
                curbMesh.position.set((wall.start.x + wall.end.x) / 2, curbH / 2, (wall.start.y + wall.end.y) / 2);
                curbMesh.rotation.y = -angle;
                dynamicGroup.add(curbMesh);

                // Üst Küpeşte Demir Profil
                const topRail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.04, 0.04), railingMetalMat);
                topRail.position.set((wall.start.x + wall.end.x) / 2, curbH + railingH, (wall.start.y + wall.end.y) / 2);
                topRail.rotation.y = -angle;
                dynamicGroup.add(topRail);

                // Alt Taşıyıcı Demir Profil
                const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.03, 0.03), railingMetalMat);
                bottomRail.position.set((wall.start.x + wall.end.x) / 2, curbH + 0.08, (wall.start.y + wall.end.y) / 2);
                bottomRail.rotation.y = -angle;
                dynamicGroup.add(bottomRail);

                // Dikey Ferforje Çubuklar (12cm aralıklarla)
                const pickets = Math.max(3, Math.round(length / 0.12));
                for (let i = 1; i < pickets; i++) {
                    const ratio = i / pickets;
                    const picket = new THREE.Mesh(new THREE.BoxGeometry(0.018, railingH - 0.08, 0.018), railingMetalMat);
                    const px = wall.start.x + (dx * ratio);
                    const py = wall.start.y + (dy * ratio);
                    picket.position.set(px, curbH + railingH / 2 + 0.04, py);
                    dynamicGroup.add(picket);
                }
                return;
            }

            // Standart Duvar veya Alçak Duvar
            const wallHeight = wallType === 'low_wall' ? (wall.height || 1.0) : (wall.height || 2.80);

            // Openings on this wall
            const openings = planData.openings
                .filter(o => o.wallId === wall.id)
                .sort((a, b) => a.position - b.position);

            if (openings.length === 0) {
                // Solid unbroken wall
                const wallGeo = new THREE.BoxGeometry(length, wallHeight, thickness);
                const wallMesh = new THREE.Mesh(wallGeo, wallMaterial);
                wallMesh.castShadow = true;
                wallMesh.receiveShadow = true;

                wallMesh.position.set(
                    (wall.start.x + wall.end.x) / 2,
                    wallHeight / 2,
                    (wall.start.y + wall.end.y) / 2
                );
                wallMesh.rotation.y = -angle;
                dynamicGroup.add(wallMesh);
            } else {
                let currentPos = 0;

                openings.forEach((op) => {
                    const opCenter = op.position * length;
                    const opStart = Math.max(0, opCenter - op.width / 2);
                    const opEnd = Math.min(length, opCenter + op.width / 2);

                    // 1. Wall segment before opening
                    if (opStart > currentPos) {
                        const segLen = opStart - currentPos;
                        const segGeo = new THREE.BoxGeometry(segLen, wallHeight, thickness);
                        const segMesh = new THREE.Mesh(segGeo, wallMaterial);
                        segMesh.castShadow = true;
                        segMesh.receiveShadow = true;

                        const segMid = currentPos + segLen / 2;
                        segMesh.position.set(
                            wall.start.x + (dx / length) * segMid,
                            wallHeight / 2,
                            wall.start.y + (dy / length) * segMid
                        );
                        segMesh.rotation.y = -angle;
                        dynamicGroup.add(segMesh);
                    }

                    // 2. Lintel above opening (Kiriş / Kapı-Pencere üstü)
                    const sill = op.sillHeight || 0;
                    const lintelHeight = wallHeight - sill - op.height;
                    if (lintelHeight > 0.05) {
                        const lintelGeo = new THREE.BoxGeometry(op.width, lintelHeight, thickness);
                        const lintelMesh = new THREE.Mesh(lintelGeo, wallMaterial);
                        lintelMesh.castShadow = true;

                        const lintelMidY = wallHeight - lintelHeight / 2;
                        lintelMesh.position.set(
                            wall.start.x + (dx / length) * opCenter,
                            lintelMidY,
                            wall.start.y + (dy / length) * opCenter
                        );
                        lintelMesh.rotation.y = -angle;
                        dynamicGroup.add(lintelMesh);
                    }

                    // 3. Parapet / Sill under window (Pencere altı duvar)
                    if (op.type === 'window') {
                        const sillHeight = op.sillHeight || (op.windowType === 'french' ? 0.05 : 0.90);
                        if (sillHeight > 0.05) {
                            const sillGeo = new THREE.BoxGeometry(op.width, sillHeight, thickness);
                            const sillMesh = new THREE.Mesh(sillGeo, wallMaterial);
                            sillMesh.castShadow = true;
                            sillMesh.receiveShadow = true;

                            sillMesh.position.set(
                                wall.start.x + (dx / length) * opCenter,
                                sillHeight / 2,
                                wall.start.y + (dy / length) * opCenter
                            );
                            sillMesh.rotation.y = -angle;
                            dynamicGroup.add(sillMesh);
                        }

                        // Window Glass & Frame
                        const winFrame = new THREE.Mesh(new THREE.BoxGeometry(op.width, op.height, 0.07), windowFrameMat);
                        winFrame.position.set(
                            wall.start.x + (dx / length) * opCenter,
                            sillHeight + op.height / 2,
                            wall.start.y + (dy / length) * opCenter
                        );
                        winFrame.rotation.y = -angle;
                        dynamicGroup.add(winFrame);

                        // Dual glass panels
                        const glass = new THREE.Mesh(new THREE.BoxGeometry(op.width - 0.08, op.height - 0.08, 0.02), windowGlassMat);
                        glass.position.copy(winFrame.position);
                        glass.rotation.copy(winFrame.rotation);
                        dynamicGroup.add(glass);
                    }

                    // 4. Door 3D Models (Standard, Steel Entrance, Sliding, Double Glass)
                    if (op.type === 'door') {
                        const doorGroup = new THREE.Group();
                        const doorType = op.doorType || 'standard';

                        if (doorType === 'steel') {
                            // Çelik Kapı (Lüks Antrasit Daire Giriş Kapısı)
                            const frameGeo = new THREE.BoxGeometry(op.width, op.height, 0.12);
                            const frame = new THREE.Mesh(frameGeo, windowFrameMat);
                            frame.position.set(0, op.height / 2, 0);
                            doorGroup.add(frame);

                            // Çelik Kanat
                            const leafGeo = new THREE.BoxGeometry(op.width - 0.06, op.height - 0.03, 0.06);
                            const leaf = new THREE.Mesh(leafGeo, steelDoorMat);
                            leaf.position.set(0, op.height / 2, 0);
                            leaf.castShadow = true;
                            doorGroup.add(leaf);

                            // Dikey Paslanmaz Çelik Kol
                            const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.85, 12), chromeMat);
                            handleBar.position.set(op.width * 0.35, 1.05, 0.05);
                            doorGroup.add(handleBar);
                        } else if (doorType === 'sliding') {
                            // Sürgülü Cam Kapı (Balkon veya Salon)
                            const frameGeo = new THREE.BoxGeometry(op.width, op.height, 0.08);
                            const frame = new THREE.Mesh(frameGeo, windowFrameMat);
                            frame.position.set(0, op.height / 2, 0);
                            doorGroup.add(frame);

                            // İki sürgü kanadı
                            const halfW = (op.width - 0.06) / 2;
                            const glassPanel1 = new THREE.Mesh(new THREE.BoxGeometry(halfW, op.height - 0.06, 0.02), windowGlassMat);
                            glassPanel1.position.set(-halfW / 2, op.height / 2, -0.015);
                            doorGroup.add(glassPanel1);

                            const glassPanel2 = new THREE.Mesh(new THREE.BoxGeometry(halfW, op.height - 0.06, 0.02), windowGlassMat);
                            glassPanel2.position.set(halfW / 2 - 0.15, op.height / 2, 0.015); // partially slid open
                            doorGroup.add(glassPanel2);
                        } else {
                            // Ahşap Oda Kapısı
                            const frameGeo = new THREE.BoxGeometry(op.width, op.height, 0.1);
                            const frame = new THREE.Mesh(frameGeo, windowFrameMat);
                            frame.position.set(0, op.height / 2, 0);
                            doorGroup.add(frame);

                            const leafGeo = new THREE.BoxGeometry(op.width - 0.08, op.height - 0.04, 0.04);
                            const leaf = new THREE.Mesh(leafGeo, doorWoodMat);
                            leaf.position.set(-(op.width - 0.08) / 2, op.height / 2, 0);
                            leaf.rotation.y = 0.45; // open 25 degrees
                            leaf.castShadow = true;
                            doorGroup.add(leaf);

                            // Metal kapı kolu
                            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12), chromeMat);
                            handle.rotation.z = Math.PI / 2;
                            handle.position.set(-(op.width - 0.08) / 2 + 0.08, op.height / 2 - 0.05, 0.04);
                            doorGroup.add(handle);
                        }

                        doorGroup.position.set(
                            wall.start.x + (dx / length) * opCenter,
                            0,
                            wall.start.y + (dy / length) * opCenter
                        );
                        doorGroup.rotation.y = -angle;
                        dynamicGroup.add(doorGroup);
                    }

                    currentPos = opEnd;
                });

                // Final wall segment after last opening
                if (currentPos < length) {
                    const segLen = length - currentPos;
                    const segGeo = new THREE.BoxGeometry(segLen, wallHeight, thickness);
                    const segMesh = new THREE.Mesh(segGeo, wallMaterial);
                    segMesh.castShadow = true;
                    segMesh.receiveShadow = true;

                    const segMid = currentPos + segLen / 2;
                    segMesh.position.set(
                        wall.start.x + (dx / length) * segMid,
                        wallHeight / 2,
                        wall.start.y + (dy / length) * segMid
                    );
                    segMesh.rotation.y = -angle;
                    dynamicGroup.add(segMesh);
                }
            }
        });

        // ── 5. Roof Generation (Çatı Oluşturma) ──
        if (planData.roof?.enabled && planData.walls.length > 0) {
            // Find overall bounding box of all walls
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            planData.walls.forEach(w => {
                minX = Math.min(minX, w.start.x, w.end.x);
                maxX = Math.max(maxX, w.start.x, w.end.x);
                minY = Math.min(minY, w.start.y, w.end.y);
                maxY = Math.max(maxY, w.start.y, w.end.y);
            });

            const roofOverhang = planData.roof.overhang || 0.6;
            const roofH = planData.roof.height || 1.8;
            const buildingW = (maxX - minX) + roofOverhang * 2;
            const buildingD = (maxY - minY) + roofOverhang * 2;
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const baseElevation = 2.80; // top of standard walls

            if (planData.roof.type === 'pitched' || planData.roof.type === 'hip') {
                // Gable / Hip Roof Geometry (Pyramid/Wedge)
                const roofGeo = new THREE.ConeGeometry(Math.max(buildingW, buildingD) * 0.72, roofH, 4);
                const roofMesh = new THREE.Mesh(roofGeo, roofTileMat);
                roofMesh.position.set(centerX, baseElevation + roofH / 2, centerY);
                roofMesh.rotation.y = Math.PI / 4;
                roofMesh.castShadow = true;
                dynamicGroup.add(roofMesh);
            } else {
                // Modern Düz Teras Çatı (Flat Roof with Parapet)
                const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(buildingW, 0.25, buildingD), wallCapMaterial);
                roofSlab.position.set(centerX, baseElevation + 0.125, centerY);
                roofSlab.castShadow = true;
                roofSlab.receiveShadow = true;
                dynamicGroup.add(roofSlab);

                // Çatı parapeti
                const parapetH = 0.45;
                const parapetGeo = new THREE.BoxGeometry(buildingW, parapetH, 0.2);
                const p1 = new THREE.Mesh(parapetGeo, wallMaterial);
                p1.position.set(centerX, baseElevation + 0.25 + parapetH / 2, centerY - buildingD / 2 + 0.1);
                dynamicGroup.add(p1);

                const p2 = new THREE.Mesh(parapetGeo, wallMaterial);
                p2.position.set(centerX, baseElevation + 0.25 + parapetH / 2, centerY + buildingD / 2 - 0.1);
                dynamicGroup.add(p2);
            }
        }

        // ── 6. Build Furniture ──
        planData.furniture.forEach(item => {
            const meshGroup = createFurniture3D(item);
            dynamicGroup.add(meshGroup);
        });

        scene.add(dynamicGroup);

    }, [planData]);

    // First-Person Mode Keyboard & Mouse Handlers
    useEffect(() => {
        if (viewMode !== 'walk') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            keysPressedRef.current[e.key] = true;
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressedRef.current[e.key] = false;
        };

        const handleMouseDown = (e: MouseEvent) => {
            isMouseDownRef.current = true;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isMouseDownRef.current) return;
            const dx = e.clientX - lastMousePosRef.current.x;
            const dy = e.clientY - lastMousePosRef.current.y;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };

            const sensitivity = 0.003;
            walkAngleRef.current.yaw += dx * sensitivity;
            walkAngleRef.current.pitch -= dy * sensitivity;
        };

        const handleMouseUp = () => {
            isMouseDownRef.current = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [viewMode]);

    // Teleport Camera Helper
    const teleportTo = (x: number, z: number) => {
        walkPosRef.current.set(x, 1.65, z);
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

            {/* 3D Top Bar Controls */}
            <div style={{
                position: 'absolute',
                top: 16,
                right: 16,
                display: 'flex',
                gap: '8px',
                zIndex: 10
            }}>
                <button
                    onClick={() => onToggleViewMode('orbit')}
                    style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: viewMode === 'orbit' ? '#2563eb' : 'rgba(255,255,255,0.9)',
                        color: viewMode === 'orbit' ? '#fff' : '#1e293b',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                >
                    🦅 Kuşbakışı 3D
                </button>
                <button
                    onClick={() => onToggleViewMode('walk')}
                    style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: viewMode === 'walk' ? '#10b981' : 'rgba(255,255,255,0.9)',
                        color: viewMode === 'walk' ? '#fff' : '#1e293b',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                >
                    🚶 Dairede Gez (İç Mekan)
                </button>
            </div>

            {/* First Person Walkthrough HUD & Instructions */}
            {viewMode === 'walk' && (
                <div style={{
                    position: 'absolute',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(8px)',
                    color: '#fff',
                    padding: '10px 20px',
                    borderRadius: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    fontSize: '11px',
                    zIndex: 10,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>W A S D</span>
                        <span>veya Ok Tuşları: Yürü</span>
                    </div>
                    <span>•</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>Fareyi Sürükle</span>
                        <span>Etrafa Bak (360°)</span>
                    </div>
                    <span>•</span>
                    {/* Odalara Hızlı Işınlanma */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => teleportTo(8.5, 3.5)} style={{ padding: '3px 8px', fontSize: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Salon</button>
                        <button onClick={() => teleportTo(1.6, 6.8)} style={{ padding: '3px 8px', fontSize: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Yatak Odası</button>
                        <button onClick={() => teleportTo(9.5, 6.5)} style={{ padding: '3px 8px', fontSize: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Banyo</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Viewer3D;
