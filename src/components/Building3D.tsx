import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Apartment } from '../types';

export interface Building3DConfig {
    facadeHex:        number;
    balconyDepth:     number;
    windowCount:      number;
    floorHeight:      number;
    floorProjection?: number;
    windowSize?:      'small' | 'medium' | 'large';
    roofType?:        'flat' | 'pointed';
}

interface Building3DProps {
    apartments:          Apartment[];
    onSelectApartment?:  (apt: Apartment) => void;
    buildingWidth?:      number;
    buildingDepth?:      number;
    projectName?:        string;
    companyName?:        string;
    config?:             Building3DConfig;
}

// ── Statü renkleri ────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, number> = {
    available: 0x1d6b38,
    sold:      0x3b4f68,
    owner:     0xb45309,
    common:    0x475569,
};

const STATUS_OP: Record<string, number> = {
    available: 0.72,
    sold:      0.45,
    owner:     0.72,
    common:    0.40,
};

// ── Bina boyutları (gerçek renderlardan) ─────────────────────────────────
const BW   = 14.0;   // genişlik (X)
const BD   = 8.5;    // derinlik (Z)
const FH   = 3.2;    // kat yüksekliği
const BAND = 0.28;   // kat arası navy bant

// Pencere parametreleri
const WW = 0.90;    // tek pencere genişliği
const WH = 1.30;    // tek pencere yüksekliği
const WG = 0.22;    // pencereler arası boşluk
const FT = 0.08;    // çerçeve payı
const FD = 0.16;    // çerçeve duvardan çıkıntı
const GD = 0.07;    // cam kalınlığı
const WIN_DX = [-(WW + WG), 0, (WW + WG)];  // 3'lü grup X ofsetleri

// Balkon
const CBKW = 2.5;
const CBKD = 1.15;
const CBKH = 0.12;
const BRH  = 0.88;  // korkuluk yüksekliği
const BRT  = 0.035; // çubuk kalınlığı

// ── Yardımcılar ───────────────────────────────────────────────────────────
function mat(
    color: number, roughness = 0.65, metalness = 0.05,
    transparent = false, opacity = 1
) {
    return new THREE.MeshStandardMaterial({
        color, roughness, metalness, transparent, opacity,
        side: THREE.FrontSide,
    });
}

function box(w: number, h: number, d: number) { 
    return new THREE.BoxGeometry(w, h, d); 
}

function aptSprite(text: string): THREE.Sprite {
    const c = document.createElement('canvas');
    c.width = 104; c.height = 36;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.roundRect(2, 2, 100, 32, 5);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 52, 18);
    return new THREE.Sprite(
        new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true })
    );
}

function floorSprite(text: string, duplex = false): THREE.Sprite {
    const w = duplex ? 210 : 130;
    const c = document.createElement('canvas');
    c.width = w; c.height = 40;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = duplex ? 'rgba(109,40,217,0.88)' : 'rgba(13,31,53,0.85)';
    ctx.roundRect(2, 2, w - 4, 36, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${duplex ? 14 : 16}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, 20);
    return new THREE.Sprite(
        new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true, sizeAttenuation: true })
    );
}

// ── Bileşen ───────────────────────────────────────────────────────────────
const Building3D: React.FC<Building3DProps> = ({
    apartments, onSelectApartment,
    buildingWidth, buildingDepth,
    projectName, companyName, config: _config,
}) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const rendRef  = useRef<THREE.WebGLRenderer | null>(null);
    const camRef   = useRef<THREE.PerspectiveCamera | null>(null);
    const ctrlRef  = useRef<OrbitControls | null>(null);
    const rafRef   = useRef<number>(0);
    const winsRef  = useRef<{ mesh: THREE.Mesh; apt: Apartment }[]>([]);
    const hovRef   = useRef<THREE.Mesh | null>(null);

    const buildScene = useCallback((scene: THREE.Scene): number => {
        winsRef.current = [];
        const bw = buildingWidth  ?? BW;
        const bd = buildingDepth  ?? BD;

        const slots = [
            { x: -bw * 0.22, side:  1 },
            { x:  bw * 0.22, side:  1 },
            { x:  bw * 0.22, side: -1 },
            { x: -bw * 0.22, side: -1 },
        ];

        const balconyX = [
            -bw / 2 + CBKW / 2 + 0.25,
             bw / 2 - 0.70 - CBKW / 2,
             bw / 2 - CBKW / 2 - 0.25,
            -bw / 2 + CBKW / 2 + 0.25,
        ];

        const isDuplexFloor = (apts: Apartment[]) =>
            apts.some(a =>
                (a.apartment_number ?? '').toUpperCase().includes('DUBLEKS') ||
                (a.apartment_number ?? '').toUpperCase().includes('DBX') ||
                a.square_meters === 200
            );

        const floorMap = new Map<number, Apartment[]>();
        apartments.forEach(a => {
            const f = a.floor ?? 0;
            if (!floorMap.has(f)) floorMap.set(f, []);
            floorMap.get(f)!.push(a);
        });

        const floors        = Array.from(floorMap.keys()).sort((a, b) => a - b);
        const basementCount = floors.filter(f => f < 0).length;
        const floorHeights  = floors.map(f => isDuplexFloor(floorMap.get(f)!) ? FH * 2 : FH);
        const totalH        = floorHeights.reduce((s, h) => s + h, 0);
        const groundLevel   = floors.slice(0, basementCount).reduce((s, _, i) => s + floorHeights[i], 0);

        const yBases: number[] = [];
        let cumY = -groundLevel;
        floors.forEach((_, fi) => { yBases.push(cumY); cumY += floorHeights[fi]; });

        const body = new THREE.Mesh(box(bw, totalH, bd), mat(0xf5f6f8, 0.88, 0));
        body.position.set(0, totalH / 2 - groundLevel, 0);
        body.receiveShadow = true;
        scene.add(body);

        const brick = new THREE.Mesh(box(0.65, totalH, bd + 0.12), mat(0x9b4040, 0.88, 0));
        brick.position.set(bw / 2 - 0.32, totalH / 2 - groundLevel, 0);
        scene.add(brick);

        const strip = new THREE.Mesh(box(0.20, totalH, bd + 0.10), mat(0x1a3358, 0.75, 0));
        strip.position.set(-bw / 2 + 0.10, totalH / 2 - groundLevel, 0);
        scene.add(strip);

        if (basementCount > 0) {
            const soil = new THREE.Mesh(new THREE.BoxGeometry(80, groundLevel + 0.1, 80), mat(0x6b4226, 0.95, 0));
            soil.position.set(0, -groundLevel / 2, 0);
            scene.add(soil);

            const rim = new THREE.Mesh(box(BW + 1.8, 0.15, BD + 1.8), mat(0x4a2c10, 0.95, 0));
            rim.position.set(0, 0.02, 0);
            scene.add(rim);
        }

        floors.forEach((floor, fi) => {
            const yBase  = yBases[fi];
            const flH    = floorHeights[fi];
            const duplex = flH > FH;
            const apts   = floorMap.get(floor)!.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

            const bandColor = fi === 0 ? 0x0d1f35 : duplex ? 0x5b21b6 : 0x1e3a5f;
            const band = new THREE.Mesh(box(bw + 0.1, BAND, bd + 0.1), mat(bandColor, 0.6, 0.05));
            band.position.set(0, yBase + BAND / 2, 0);
            scene.add(band);

            if (duplex) {
                const mid = new THREE.Mesh(box(bw - 0.6, 0.09, bd - 0.6), mat(0x7c3aed, 0.7, 0));
                mid.position.set(0, yBase + FH, 0);
                scene.add(mid);
            }

            const baseLabel = floor === 0 ? 'ZEMİN' : floor < 0 ? `B${Math.abs(floor)}` : `${floor}.KAT`;
            const lbl = floorSprite(duplex ? `${baseLabel} · DUBLEKS` : baseLabel, duplex);
            lbl.scale.set(duplex ? 3.8 : 2.5, 0.74, 1);
            lbl.position.set(-bw / 2 - (duplex ? 2.8 : 2.1), yBase + BAND + (flH - BAND) * 0.5, 0);
            scene.add(lbl);

            if (floor === 0) {
                const vitrinH = flH - BAND - 0.12;
                [1, -1].forEach(side => {
                    const vz = (bd / 2) * side;
                    const zo = side;

                    const vFrame = new THREE.Mesh(box(bw * 0.80, vitrinH + 0.12, FD), mat(0x1e3a5f, 0.55, 0.1));
                    vFrame.position.set(-bw * 0.08, yBase + BAND + vitrinH / 2, vz + zo * (FD / 2));
                    scene.add(vFrame);

                    const vGlass = new THREE.Mesh(box(bw * 0.78, vitrinH, GD), mat(0x7eb8d4, 0.05, 0.55, true, 0.38));
                    vGlass.position.set(-bw * 0.08, yBase + BAND + vitrinH / 2, vz + zo * (FD / 2 + 0.02));
                    scene.add(vGlass);

                    for (let di = 0; di < 3; di++) {
                        const dx = -bw * 0.34 + di * (bw * 0.30);
                        const div = new THREE.Mesh(box(0.06, vitrinH, 0.05), mat(0x1e3a5f, 0.6, 0.1));
                        div.position.set(dx, yBase + BAND + vitrinH / 2, vz + zo * (FD / 2 + 0.03));
                        scene.add(div);
                    }
                });
            }

            apts.forEach((apt, ai) => {
                if (ai >= slots.length) return;
                const slot  = slots[ai];
                const zFace = (bd / 2) * slot.side;
                const zo    = slot.side;
                const col   = STATUS_COLOR[apt.status] ?? STATUS_COLOR.sold;
                const op    = STATUS_OP[apt.status] ?? 0.5;
                const _dim  = apt.status === 'sold' || apt.status === 'common'; 
                void _dim;

                if (floor !== 0) {
                    const winH = duplex ? WH * 1.75 : WH;
                    const winY = yBase + BAND + (flH - BAND) * 0.55;

                    WIN_DX.forEach((dx, wi) => {
                        const wx = slot.x + dx;

                        const frame = new THREE.Mesh(
                            box(WW + FT * 2, winH + FT * 2, FD),
                            mat(0x1e3a5f, 0.55, 0.08)
                        );
                        frame.position.set(wx, winY, zFace + zo * (FD / 2 + 0.01));
                        scene.add(frame);

                        const glass = new THREE.Mesh(
                            box(WW, winH, GD),
                            mat(col, 0.08, 0.45, true, op * (wi === 1 ? 1 : 0.85))
                        );
                        glass.position.set(wx, winY, zFace + zo * (FD / 2 + GD / 2 + 0.02));
                        scene.add(glass);

                        if (wi === 1) {
                            glass.userData = { apt };
                            winsRef.current.push({ mesh: glass, apt });
                        }
                    });

                    const label = apt.apartment_number ? `D.${apt.apartment_number}` : `D.${ai + 1}`;
                    const sp = aptSprite(label);
                    sp.scale.set(0.82, 0.30, 1);
                    sp.position.set(slot.x, winY - (winH / 2) - 0.28, zFace + zo * (FD + 0.10));
                    scene.add(sp);
                }

                if (floor >= 1) {
                    const bkX   = balconyX[ai];
                    const slabY = yBase + BAND + 0.06;

                    const slab = new THREE.Mesh(box(CBKW, CBKH, CBKD), mat(0xedf0f4, 0.82, 0));
                    slab.position.set(bkX, slabY, zFace + zo * (CBKD / 2));
                    scene.add(slab);

                    const nose = new THREE.Mesh(box(CBKW + 0.1, 0.05, 0.10), mat(0x1e3a5f, 0.7, 0));
                    nose.position.set(bkX, slabY - 0.025, zFace + zo * (CBKD + 0.05));
                    scene.add(nose);

                    const topRail = new THREE.Mesh(box(CBKW, BRT, BRT), mat(0x1e3a5f, 0.35, 0.55));
                    topRail.position.set(bkX, slabY + CBKH + BRH, zFace + zo * (CBKD + 0.01));
                    scene.add(topRail);

                    const botRail = new THREE.Mesh(box(CBKW, BRT, BRT), mat(0x1e3a5f, 0.35, 0.55));
                    botRail.position.set(bkX, slabY + CBKH + BRH * 0.2, zFace + zo * (CBKD + 0.01));
                    scene.add(botRail);

                    const barCount = 10;
                    for (let bi = 0; bi < barCount; bi++) {
                        const bx = bkX - CBKW / 2 + (bi / (barCount - 1)) * CBKW;
                        const bar = new THREE.Mesh(box(BRT, BRH, BRT), mat(0x1e3a5f, 0.35, 0.55));
                        bar.position.set(bx, slabY + CBKH + BRH / 2, zFace + zo * (CBKD + 0.01));
                        scene.add(bar);
                    }

                    [0, CBKD].forEach(offset => {
                        const sideRail = new THREE.Mesh(box(BRT, BRH, BRT), mat(0x1e3a5f, 0.35, 0.55));
                        sideRail.position.set(bkX - CBKW / 2, slabY + CBKH + BRH / 2, zFace + zo * offset);
                        scene.add(sideRail);

                        const sideRail2 = new THREE.Mesh(box(BRT, BRH, BRT), mat(0x1e3a5f, 0.35, 0.55));
                        sideRail2.position.set(bkX + CBKW / 2, slabY + CBKH + BRH / 2, zFace + zo * offset);
                        scene.add(sideRail2);
                    });

                    if (duplex) {
                        const slabY2 = yBase + FH + BAND + 0.06;
                        const CBKW2  = CBKW * 0.65;
                        const slab2  = new THREE.Mesh(box(CBKW2, CBKH, CBKD), mat(0xedf0f4, 0.82, 0));
                        slab2.position.set(bkX, slabY2, zFace + zo * (CBKD / 2));
                        scene.add(slab2);

                        const tr2 = new THREE.Mesh(box(CBKW2, BRT, BRT), mat(0x5b21b6, 0.35, 0.55));
                        tr2.position.set(bkX, slabY2 + CBKH + BRH, zFace + zo * (CBKD + 0.01));
                        scene.add(tr2);

                        for (let bi = 0; bi < 6; bi++) {
                            const bx = bkX - CBKW2 / 2 + (bi / 5) * CBKW2;
                            const bar2 = new THREE.Mesh(box(BRT, BRH, BRT), mat(0x5b21b6, 0.35, 0.55));
                            bar2.position.set(bx, slabY2 + CBKH + BRH / 2, zFace + zo * (CBKD + 0.01));
                            scene.add(bar2);
                        }
                    }
                }
            });
        });

        const roofH   = 0.55;
        const roofTop = totalH - groundLevel;
        const parapet = new THREE.Mesh(box(bw + 2.6, roofH, bd + 2.6), mat(0x0d1f35, 0.55, 0.08));
        parapet.position.set(0, roofTop + roofH / 2, 0);
        parapet.castShadow = true;
        scene.add(parapet);

        const roofLine = new THREE.Mesh(box(bw + 2.4, 0.07, bd + 2.4), mat(0x1a3358, 0.8, 0));
        roofLine.position.set(0, roofTop - 0.04, 0);
        scene.add(roofLine);

        const roofTop2 = new THREE.Mesh(box(bw + 1.8, 0.07, bd + 1.8), mat(0x1a3358, 0.8, 0));
        roofTop2.position.set(0, roofTop + roofH + 0.04, 0);
        scene.add(roofTop2);

        const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat(0x1e293b, 0.95, 0));
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        const grass = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat(0x14532d, 0.9, 0, true, 0.5));
        grass.rotation.x = -Math.PI / 2;
        grass.position.y = 0.003;
        scene.add(grass);

        return roofTop;
    }, [apartments, buildingWidth, buildingDepth]);

    useEffect(() => {
        if (!mountRef.current) return;
        const el = mountRef.current;
        const W  = el.clientWidth;
        const H  = el.clientHeight || 560;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);
        scene.fog = new THREE.Fog(0xbfdbfe, 80, 220);
        scene.add(new THREE.AmbientLight(0xffffff, 0.9));

        const sun = new THREE.DirectionalLight(0xfff8e7, 1.35);
        sun.position.set(25, 38, 22);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.near   = 0.5;  sun.shadow.camera.far    = 150;
        sun.shadow.camera.left   = -50;  sun.shadow.camera.right  =  50;
        sun.shadow.camera.top    =  50;  sun.shadow.camera.bottom = -50;
        scene.add(sun);

        const fill = new THREE.DirectionalLight(0xdbeafe, 0.42);
        fill.position.set(-18, 14, -22);
        scene.add(fill);

        const roofTop = buildScene(scene);
        const dist = Math.max(BW, roofTop) + 15;

        const cam  = new THREE.PerspectiveCamera(40, W / H, 0.1, 400);
        cam.position.set(dist * 0.62, roofTop * 0.52, dist * 0.82);
        cam.lookAt(0, roofTop * 0.42, 0);
        camRef.current = cam;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
        renderer.toneMapping       = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        el.appendChild(renderer.domElement);
        rendRef.current = renderer;

        const controls = new OrbitControls(cam, renderer.domElement);
        controls.target.set(0, roofTop * 0.42, 0);
        controls.enableDamping   = true;
        controls.dampingFactor   = 0.07;
        controls.minDistance     = 6;
        controls.maxDistance     = dist * 2.5;
        controls.maxPolarAngle   = Math.PI / 2.05;
        controls.autoRotate      = true;
        controls.autoRotateSpeed = 0.55;
        controls.update();
        ctrlRef.current = controls;

        const animate = () => {
            rafRef.current = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, cam);
        };
        animate();

        const onResize = () => {
            const w = el.clientWidth, h = el.clientHeight || 560;
            cam.aspect = w / h;
            cam.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
            cancelAnimationFrame(rafRef.current);
            controls.dispose();
            renderer.dispose();
            if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
        };
    }, [apartments, buildingWidth, buildingDepth, buildScene]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!mountRef.current || !camRef.current) return;
        const rect  = mountRef.current.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const rc = new THREE.Raycaster();
        rc.setFromCamera(mouse, camRef.current);
        const hits = rc.intersectObjects(winsRef.current.map(m => m.mesh));

        if (hovRef.current && hovRef.current !== hits[0]?.object) {
            const prev = winsRef.current.find(m => m.mesh === hovRef.current);
            if (prev) {
                (prev.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
            }
            hovRef.current = null;
        }

        if (hits.length > 0) {
            const hit   = hits[0].object as THREE.Mesh;
            const found = winsRef.current.find(m => m.mesh === hit);
            if (found && (found.apt.status === 'available' || found.apt.status === 'owner')) {
                const mt = hit.material as THREE.MeshStandardMaterial;
                mt.emissive = new THREE.Color(0xffffff);
                mt.emissiveIntensity = 0.3;
                hovRef.current = hit;
                mountRef.current.style.cursor = 'pointer';
            } else {
                mountRef.current.style.cursor = 'default';
            }
        } else if (mountRef.current) {
            mountRef.current.style.cursor = 'default';
        }
    }, []);

    const handleClick = useCallback((e: React.MouseEvent) => {
        if (!mountRef.current || !camRef.current) return;
        const rect  = mountRef.current.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const rc = new THREE.Raycaster();
        rc.setFromCamera(mouse, camRef.current);
        const hits = rc.intersectObjects(winsRef.current.map(m => m.mesh));

        if (hits.length > 0) {
            const found = winsRef.current.find(m => m.mesh === hits[0].object);
            if (found?.apt.status === 'available' && onSelectApartment) {
                onSelectApartment(found.apt);
                if (ctrlRef.current) ctrlRef.current.autoRotate = false;
            }
        }
    }, [onSelectApartment]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '560px', overflow: 'hidden', borderRadius: '0 0 12px 12px' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }}
                onMouseMove={handleMouseMove} onClick={handleClick}
            />

            {(projectName || companyName) && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ background: '#0d1f35', color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: 1.5, padding: '6px 24px', borderRadius: '0 0 10px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                    {companyName || projectName}
                </div>
            </div>
            )}

            <div style={{ position: 'absolute', bottom: 14, left: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                    { color: '#16a34a', label: 'Satılık' },
                    { color: '#d97706', label: 'Mal Sahibi' },
                    { color: '#475569', label: 'Satıldı' },
                ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(15,23,42,0.78)', padding: '4px 10px', borderRadius: 20, backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ width: 9, height: 9, borderRadius: 2, background: item.color }} />
                        <span style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 600 }}>{item.label}</span>
                    </div>
                ))}
            </div>

            <div style={{ position: 'absolute', top: 12, right: 12, color: '#1e3a5f', fontSize: 10, textAlign: 'right', lineHeight: 1.8, background: 'rgba(255,255,255,0.78)', padding: '6px 10px', borderRadius: 8, fontWeight: 600 }}>
                Sürükle: Döndür &nbsp;|&nbsp; Scroll: Zoom<br />
                Pencereye Tıkla: Daire Seç
            </div>
        </div>
    );
};

export default Building3D;