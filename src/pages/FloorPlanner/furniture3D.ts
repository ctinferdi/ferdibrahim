import * as THREE from 'three';
import { FurnitureItem } from './types';

// Shared Materials Cache for High Performance
const materials = {
    fabricGray: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85, metalness: 0.05 }),
    fabricLight: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9, metalness: 0.05 }),
    fabricPillow: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7, metalness: 0.1 }),
    fabricBed: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9, metalness: 0.0 }),
    duvet: new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.8, metalness: 0.0 }),
    woodOak: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6, metalness: 0.1 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.55, metalness: 0.1 }),
    metalBlack: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 }),
    metalChrome: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.95 }),
    tvScreen: new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.2, metalness: 0.5 }),
    marbleCounter: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.1 }),
    ceramicWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.05 }),
    glassShower: new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.4,
        roughness: 0.05,
        metalness: 0.1,
        transmission: 0.9,
        ior: 1.5
    }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.05, metalness: 0.98 })
};

export function createFurniture3D(item: FurnitureItem): THREE.Group {
    const group = new THREE.Group();
    const { width: w, depth: d, height: h, type } = item;

    switch (type) {
        case 'l_sofa': {
            // ── L-Koltuk ──
            // Ana Gövde (Oturak)
            const seat1 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d * 0.55), materials.fabricGray);
            seat1.position.set(0, 0.2, -d * 0.22);
            seat1.castShadow = true;
            group.add(seat1);

            // L-Uzantısı (Şezlong)
            const chaise = new THREE.Mesh(new THREE.BoxGeometry(d * 0.55, 0.4, d), materials.fabricGray);
            chaise.position.set(w * 0.5 - (d * 0.55) / 2, 0.2, 0);
            chaise.castShadow = true;
            group.add(chaise);

            // Arka Sırtlık (Ana)
            const back1 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.55, 0.25), materials.fabricGray);
            back1.position.set(0, 0.55, -d * 0.5 + 0.125);
            back1.castShadow = true;
            group.add(back1);

            // Yan Kolçak
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, d * 0.6), materials.fabricGray);
            arm.position.set(-w * 0.5 + 0.125, 0.45, -d * 0.2);
            arm.castShadow = true;
            group.add(arm);

            // Kırlentler (Yastıklar)
            const pillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.15), materials.fabricPillow);
            pillow1.position.set(-w * 0.25, 0.45, -d * 0.3);
            pillow1.rotation.y = 0.2;
            group.add(pillow1);

            const pillow2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.15), materials.fabricLight);
            pillow2.position.set(w * 0.1, 0.45, -d * 0.3);
            group.add(pillow2);
            break;
        }

        case 'sofa_3seater': {
            // ── 3'lü Kanepe ──
            const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), materials.fabricGray);
            seat.position.set(0, 0.2, 0);
            seat.castShadow = true;
            group.add(seat);

            const back = new THREE.Mesh(new THREE.BoxGeometry(w, 0.55, 0.25), materials.fabricGray);
            back.position.set(0, 0.55, -d * 0.5 + 0.125);
            back.castShadow = true;
            group.add(back);

            const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, d), materials.fabricGray);
            armL.position.set(-w * 0.5 + 0.1, 0.42, 0);
            group.add(armL);

            const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, d), materials.fabricGray);
            armR.position.set(w * 0.5 - 0.1, 0.42, 0);
            group.add(armR);
            break;
        }

        case 'coffee_table': {
            // ── Orta Sehpa ──
            const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), materials.woodDark);
            top.position.set(0, h - 0.02, 0);
            top.castShadow = true;
            group.add(top);

            // Metal Ayaklar
            const legGeo = new THREE.CylinderGeometry(0.02, 0.02, h - 0.04);
            const corners = [
                [-w * 0.45, -d * 0.45],
                [w * 0.45, -d * 0.45],
                [-w * 0.45, d * 0.45],
                [w * 0.45, d * 0.45]
            ];
            corners.forEach(([lx, lz]) => {
                const leg = new THREE.Mesh(legGeo, materials.metalBlack);
                leg.position.set(lx, (h - 0.04) / 2, lz);
                group.add(leg);
            });
            break;
        }

        case 'tv_unit': {
            // ── TV Ünitesi & Geniş TV ──
            // Alt Konsol
            const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(w, 0.45, d), materials.woodDark);
            consoleBox.position.set(0, 0.225, 0);
            consoleBox.castShadow = true;
            group.add(consoleBox);

            // TV Ekranı
            const tvStand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.3), materials.metalBlack);
            tvStand.position.set(0, 0.47, 0);
            group.add(tvStand);

            const tvPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.15), materials.metalBlack);
            tvPole.position.set(0, 0.55, 0);
            group.add(tvPole);

            const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.8, 0.04), materials.tvScreen);
            tvScreen.position.set(0, 1.0, 0);
            tvScreen.castShadow = true;
            group.add(tvScreen);
            break;
        }

        case 'carpet': {
            // ── Halı ──
            const carpet = new THREE.Mesh(new THREE.BoxGeometry(w, 0.015, d), materials.fabricLight);
            carpet.position.set(0, 0.008, 0);
            carpet.receiveShadow = true;
            group.add(carpet);
            break;
        }

        case 'kitchen_l': {
            // ── L-Mutfak Tezgahı ──
            // Ana Alt Dolaplar
            const base1 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.86, 0.6), materials.marbleCounter);
            base1.position.set(0, 0.43, -d * 0.5 + 0.3);
            base1.castShadow = true;
            group.add(base1);

            // L-Uzantısı
            const base2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.86, d - 0.6), materials.marbleCounter);
            base2.position.set(w * 0.5 - 0.3, 0.43, 0.3);
            base2.castShadow = true;
            group.add(base2);

            // Tezgah Üstü (Mermer)
            const top1 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.64), materials.ceramicWhite);
            top1.position.set(0, 0.88, -d * 0.5 + 0.3);
            group.add(top1);

            // Evye
            const sink = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.4), materials.metalChrome);
            sink.position.set(0, 0.905, -d * 0.5 + 0.3);
            group.add(sink);

            // Batarya / Musluk
            const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25), materials.metalChrome);
            faucet.position.set(0, 1.05, -d * 0.5 + 0.15);
            group.add(faucet);
            break;
        }

        case 'fridge': {
            // ── Buzdolabı ──
            const fridge = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials.metalChrome);
            fridge.position.set(0, h / 2, 0);
            fridge.castShadow = true;
            group.add(fridge);

            // Kapı Çizgisi
            const split = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.02, 0.02), materials.metalBlack);
            split.position.set(0, h * 0.6, d / 2);
            group.add(split);
            break;
        }

        case 'dining_table': {
            // ── Yemek Masası & Sandalyeler ──
            const tableTop = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), materials.woodOak);
            tableTop.position.set(0, h - 0.025, 0);
            tableTop.castShadow = true;
            group.add(tableTop);

            // Masa Ayakları
            const legGeo = new THREE.BoxGeometry(0.06, h - 0.05, 0.06);
            [
                [-w * 0.45, -d * 0.45],
                [w * 0.45, -d * 0.45],
                [-w * 0.45, d * 0.45],
                [w * 0.45, d * 0.45]
            ].forEach(([lx, lz]) => {
                const leg = new THREE.Mesh(legGeo, materials.woodDark);
                leg.position.set(lx, (h - 0.05) / 2, lz);
                group.add(leg);
            });

            // 4 Sandalye
            const chairPositions = [
                [-w * 0.25, -d * 0.7, 0],
                [w * 0.25, -d * 0.7, 0],
                [-w * 0.25, d * 0.7, Math.PI],
                [w * 0.25, d * 0.7, Math.PI]
            ];
            chairPositions.forEach(([cx, cz, rot]) => {
                const chair = new THREE.Group();
                const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.4), materials.fabricGray);
                chairSeat.position.set(0, 0.45, 0);
                chair.add(chairSeat);

                const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.04), materials.fabricGray);
                chairBack.position.set(0, 0.67, -0.18);
                chair.add(chairBack);

                chair.position.set(cx, 0, cz);
                chair.rotation.y = rot;
                group.add(chair);
            });
            break;
        }

        case 'double_bed': {
            // ── Çift Kişilik Yatak ──
            // Baza / Karyola
            const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), materials.woodOak);
            base.position.set(0, 0.175, 0);
            base.castShadow = true;
            group.add(base);

            // Başlık (Headboard)
            const headboard = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h, 0.15), materials.fabricGray);
            headboard.position.set(0, h / 2, -d / 2 + 0.075);
            headboard.castShadow = true;
            group.add(headboard);

            // Yatak Minderi
            const mattress = new THREE.Mesh(new THREE.BoxGeometry(w - 0.05, 0.25, d - 0.1), materials.fabricBed);
            mattress.position.set(0, 0.45, 0.05);
            group.add(mattress);

            // Yastıklar
            const pillowGeo = new THREE.BoxGeometry(w * 0.4, 0.12, 0.45);
            const p1 = new THREE.Mesh(pillowGeo, materials.ceramicWhite);
            p1.position.set(-w * 0.23, 0.62, -d * 0.35);
            group.add(p1);

            const p2 = new THREE.Mesh(pillowGeo, materials.ceramicWhite);
            p2.position.set(w * 0.23, 0.62, -d * 0.35);
            group.add(p2);

            // Yatak Örtüsü / Nevresim
            const duvet = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, 0.04, d * 0.55), materials.duvet);
            duvet.position.set(0, 0.59, d * 0.2);
            group.add(duvet);
            break;
        }

        case 'single_bed': {
            // ── Tek Kişilik Yatak ──
            const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), materials.woodOak);
            base.position.set(0, 0.175, 0);
            base.castShadow = true;
            group.add(base);

            const headboard = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), materials.fabricGray);
            headboard.position.set(0, h / 2, -d / 2 + 0.06);
            group.add(headboard);

            const mattress = new THREE.Mesh(new THREE.BoxGeometry(w - 0.05, 0.22, d - 0.1), materials.fabricBed);
            mattress.position.set(0, 0.44, 0.05);
            group.add(mattress);

            const pillow = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.12, 0.45), materials.ceramicWhite);
            pillow.position.set(0, 0.6, -d * 0.35);
            group.add(pillow);
            break;
        }

        case 'wardrobe': {
            // ── Gardırop ──
            const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials.woodDark);
            body.position.set(0, h / 2, 0);
            body.castShadow = true;
            group.add(body);

            // Aynalı Kapak
            const mirrorDoor = new THREE.Mesh(new THREE.BoxGeometry(w * 0.35, h * 0.9, 0.02), materials.mirror);
            mirrorDoor.position.set(0, h / 2, d / 2 + 0.01);
            group.add(mirrorDoor);
            break;
        }

        case 'desk': {
            // ── Çalışma Masası ──
            const deskTop = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), materials.woodOak);
            deskTop.position.set(0, h - 0.02, 0);
            deskTop.castShadow = true;
            group.add(deskTop);

            // Yan Paneller
            const sideGeo = new THREE.BoxGeometry(0.04, h - 0.04, d);
            const sideL = new THREE.Mesh(sideGeo, materials.metalBlack);
            sideL.position.set(-w / 2 + 0.02, (h - 0.04) / 2, 0);
            group.add(sideL);

            const sideR = new THREE.Mesh(sideGeo, materials.metalBlack);
            sideR.position.set(w / 2 - 0.02, (h - 0.04) / 2, 0);
            group.add(sideR);
            break;
        }

        case 'shower_cabin': {
            // ── Duşakabin ──
            // Duş Teknesi
            const tray = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), materials.ceramicWhite);
            tray.position.set(0, 0.04, 0);
            group.add(tray);

            // Cam Paneller
            const glassPanel = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.015), materials.glassShower);
            glassPanel.position.set(0, h / 2, d / 2);
            group.add(glassPanel);

            const glassSide = new THREE.Mesh(new THREE.BoxGeometry(0.015, h, d), materials.glassShower);
            glassSide.position.set(w / 2, h / 2, 0);
            group.add(glassSide);

            // Tepe Duşu
            const showerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02), materials.metalChrome);
            showerHead.position.set(-w * 0.2, h * 0.95, -d * 0.2);
            group.add(showerHead);
            break;
        }

        case 'toilet': {
            // ── Asma Klozet ──
            // Rezervuar Paneli
            const wallTank = new THREE.Mesh(new THREE.BoxGeometry(w * 1.2, 1.1, 0.2), materials.ceramicWhite);
            wallTank.position.set(0, 0.55, -d * 0.4);
            group.add(wallTank);

            // Klozet Taşı
            const bowl = new THREE.Mesh(new THREE.BoxGeometry(w, 0.38, d * 0.7), materials.ceramicWhite);
            bowl.position.set(0, 0.38, 0.05);
            bowl.castShadow = true;
            group.add(bowl);
            break;
        }

        case 'bathroom_vanity': {
            // ── Hilton Banyo Lavabosu & Ayna ──
            // Asma Dolap
            const vanityBox = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), materials.woodDark);
            vanityBox.position.set(0, 0.55, 0);
            vanityBox.castShadow = true;
            group.add(vanityBox);

            // Çanak Lavabo
            const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.14), materials.ceramicWhite);
            basin.position.set(0, 0.87, 0);
            group.add(basin);

            // Krom Batarya
            const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22), materials.metalChrome);
            faucet.position.set(0, 0.98, -d * 0.3);
            group.add(faucet);

            // Yuvarlak LED Ayna
            const mirrorMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.02), materials.mirror);
            mirrorMesh.rotation.x = Math.PI / 2;
            mirrorMesh.position.set(0, 1.45, -d / 2 + 0.01);
            group.add(mirrorMesh);
            break;
        }

        default: {
            // Generic fallback box
            const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials.woodOak);
            box.position.set(0, h / 2, 0);
            group.add(box);
            break;
        }
    }

    // Set position and rotation
    group.position.set(item.x, 0, item.y);
    group.rotation.y = -(item.rotation * Math.PI) / 180;

    return group;
}
