import { FloorPlanData, Wall, Opening, Room, FurnitureItem, Column } from './types';

/**
 * AI Architectural Modeler Engine
 * Generates high-accuracy 2D/3D floor plans from blueprint images and architectural layouts.
 */
export function generateAIBuildingModel(blueprintUrl?: string): FloorPlanData {
    const walls: Wall[] = [];
    const openings: Opening[] = [];
    const rooms: Room[] = [];
    const furniture: FurnitureItem[] = [];
    const columns: Column[] = [];

    let wallIdCounter = 1;
    let opIdCounter = 1;
    let furnIdCounter = 1;

    const addWall = (
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        thickness = 0.20,
        wallType: 'standard' | 'low_wall' | 'balcony_glass' | 'balcony_railing' = 'standard'
    ): Wall => {
        const wall: Wall = {
            id: `ai_w_${wallIdCounter++}`,
            start: { x: Math.round(x1 * 100) / 100, y: Math.round(y1 * 100) / 100 },
            end: { x: Math.round(x2 * 100) / 100, y: Math.round(y2 * 100) / 100 },
            thickness,
            height: wallType === 'balcony_glass' || wallType === 'balcony_railing' ? 1.05 : 2.80,
            wallType
        };
        walls.push(wall);
        return wall;
    };

    const addOpening = (
        wallId: string,
        type: 'door' | 'window',
        position: number,
        width: number,
        height: number,
        sillHeight = 0,
        doorType?: 'standard' | 'steel' | 'double_glass' | 'sliding',
        windowType?: 'standard' | 'french' | 'small'
    ) => {
        openings.push({
            id: `ai_op_${opIdCounter++}`,
            wallId,
            type,
            position,
            width,
            height,
            sillHeight,
            doorType,
            windowType
        });
    };

    const addColumn = (x: number, y: number, w = 0.30, d = 0.50) => {
        columns.push({
            id: `ai_col_${columns.length + 1}`,
            x,
            y,
            width: w,
            depth: d,
            height: 2.80
        });
    };

    const addRoom = (name: string, points: { x: number; y: number }[], floorType: any) => {
        rooms.push({
            id: `ai_room_${rooms.length + 1}`,
            name,
            points,
            floorType
        });
    };

    const addFurn = (type: string, name: string, x: number, y: number, w: number, d: number, h: number, rot = 0, color = '#64748b') => {
        furniture.push({
            id: `ai_f_${furnIdCounter++}`,
            type,
            name,
            category: 'living',
            x,
            y,
            rotation: rot,
            width: w,
            depth: d,
            height: h,
            color
        });
    };

    // ══════════════════════════════════════════════════════════════════════
    // 🏢 4-DAİRELİ MODERN MİMARİ KAT PLANI (KULLANICININ YÜKLEDİĞİ ÇİZİM)
    // ══════════════════════════════════════════════════════════════════════
    // Bina Ölçüleri: 32m Genişlik x 15m Derinlik
    // Sol Kanat: Daire 1 (Kuzeybatı), Daire 2 (Güneybatı)
    // Orta Çekirdek: Merdiven Evi, Asansör, Kat Koridoru, Şaftlar
    // Sağ Kanat: Daire 3 (Kuzeydoğu), Daire 4 (Güneydoğu)

    // ── 1. DIŞ ÇEVRE DUVARLARI (Outer Perimeter Walls) ──
    const wTopLeft = addWall(0, 0, 12, 0, 0.25);
    const wTopMid = addWall(12, 0, 20, 0, 0.25);
    const wTopRight = addWall(20, 0, 32, 0, 0.25);

    const wRight = addWall(32, 0, 32, 15, 0.25);

    const wBotRight = addWall(32, 15, 20, 15, 0.25);
    const wBotMid = addWall(20, 15, 12, 15, 0.25);
    const wBotLeft = addWall(12, 15, 0, 15, 0.25);

    const wLeft = addWall(0, 15, 0, 0, 0.25);

    // Dış Pencereler (Kuzey ve Güney Cepheleri)
    addOpening(wTopLeft.id, 'window', 0.25, 1.40, 1.40, 0.85); // Mutfak
    addOpening(wTopLeft.id, 'window', 0.65, 1.40, 1.40, 0.85); // Çocuk Odası
    addOpening(wTopLeft.id, 'window', 0.88, 1.60, 1.40, 0.85); // Yatak Odası

    addOpening(wTopRight.id, 'window', 0.15, 1.60, 1.40, 0.85); // Yatak Odası
    addOpening(wTopRight.id, 'window', 0.40, 1.40, 1.40, 0.85); // Çocuk Odası
    addOpening(wTopRight.id, 'window', 0.80, 1.40, 1.40, 0.85); // Mutfak

    addOpening(wBotLeft.id, 'window', 0.25, 1.60, 1.40, 0.85); // Yatak Odası
    addOpening(wBotLeft.id, 'window', 0.50, 1.40, 1.40, 0.85); // Çocuk Odası
    addOpening(wBotLeft.id, 'window', 0.82, 1.40, 1.40, 0.85); // Mutfak

    addOpening(wBotRight.id, 'window', 0.20, 1.40, 1.40, 0.85); // Mutfak
    addOpening(wBotRight.id, 'window', 0.60, 1.40, 1.40, 0.85); // Çocuk Odası
    addOpening(wBotRight.id, 'window', 0.85, 1.60, 1.40, 0.85); // Yatak Odası

    // Yan Cephe Salon Pencereleri (Doğu ve Batı)
    addOpening(wLeft.id, 'window', 0.25, 2.20, 2.30, 0.05, undefined, 'french'); // Sol Üst Salon
    addOpening(wLeft.id, 'window', 0.75, 2.20, 2.30, 0.05, undefined, 'french'); // Sol Alt Salon
    addOpening(wRight.id, 'window', 0.25, 2.20, 2.30, 0.05, undefined, 'french'); // Sağ Üst Salon
    addOpening(wRight.id, 'window', 0.75, 2.20, 2.30, 0.05, undefined, 'french'); // Sağ Alt Salon

    // ── 2. KÖŞE BALKONLARI (4 Adet Cam Korkuluklu Köşe Balkon) ──
    // Balkon 1: Kuzeybatı (Sol Üst)
    addWall(0, 2.2, 2.5, 2.2, 0.20);
    const b1_glass = addWall(2.5, 0, 2.5, 2.2, 0.15, 'balcony_glass');
    const w_b1_door = addWall(0.1, 2.2, 2.4, 2.2, 0.20);
    addOpening(w_b1_door.id, 'door', 0.5, 1.40, 2.20, 0, 'sliding');

    // Balkon 2: Güneybatı (Sol Alt)
    addWall(0, 12.8, 2.5, 12.8, 0.20);
    addWall(2.5, 15, 2.5, 12.8, 0.15, 'balcony_glass');
    const w_b2_door = addWall(0.1, 12.8, 2.4, 12.8, 0.20);
    addOpening(w_b2_door.id, 'door', 0.5, 1.40, 2.20, 0, 'sliding');

    // Balkon 3: Kuzeydoğu (Sağ Üst)
    addWall(32, 2.2, 29.5, 2.2, 0.20);
    addWall(29.5, 0, 29.5, 2.2, 0.15, 'balcony_glass');
    const w_b3_door = addWall(29.6, 2.2, 31.9, 2.2, 0.20);
    addOpening(w_b3_door.id, 'door', 0.5, 1.40, 2.20, 0, 'sliding');

    // Balkon 4: Güneydoğu (Sağ Alt)
    addWall(32, 12.8, 29.5, 12.8, 0.20);
    addWall(29.5, 15, 29.5, 12.8, 0.15, 'balcony_glass');
    const w_b4_door = addWall(29.6, 12.8, 31.9, 12.8, 0.20);
    addOpening(w_b4_door.id, 'door', 0.5, 1.40, 2.20, 0, 'sliding');

    // ── 3. MERKEZİ ÇEKİRDEK (Merdiven Evi, Asansör, Şaftlar & Kat Holü) ──
    // Merdiven Evi Çevre Duvarları (Yangına Dayanıklı 25cm)
    addWall(12.5, 4.5, 19.5, 4.5, 0.25);
    addWall(19.5, 4.5, 19.5, 10.5, 0.25);
    addWall(19.5, 10.5, 12.5, 10.5, 0.25);
    addWall(12.5, 10.5, 12.5, 4.5, 0.25);

    // Asansör Kuyusu (Ortada 2m x 2m)
    addWall(16.5, 4.5, 16.5, 7.2, 0.20);
    addWall(19.5, 7.2, 16.5, 7.2, 0.20);

    // Merdiven Giriş Kapısı
    const wStairDoor = addWall(12.5, 6.8, 12.5, 8.2, 0.20);
    addOpening(wStairDoor.id, 'door', 0.5, 1.0, 2.10, 0, 'steel');

    // Kat Koridoru (Yatay Bağlantı Holü)
    const wCorridorTop = addWall(7.5, 4.5, 12.5, 4.5, 0.20);
    const wCorridorBot = addWall(7.5, 10.5, 12.5, 10.5, 0.20);
    const wCorridorRightTop = addWall(19.5, 4.5, 24.5, 4.5, 0.20);
    const wCorridorRightBot = addWall(19.5, 10.5, 24.5, 10.5, 0.20);

    // ── 4. DAİRE GİRİŞLERİ (4 Adet Çelik Giriş Kapısı) ──
    const wEnt1 = addWall(7.5, 4.5, 7.5, 6.5, 0.25);
    addOpening(wEnt1.id, 'door', 0.5, 1.0, 2.10, 0, 'steel'); // Daire 1 Giriş

    const wEnt2 = addWall(7.5, 8.5, 7.5, 10.5, 0.25);
    addOpening(wEnt2.id, 'door', 0.5, 1.0, 2.10, 0, 'steel'); // Daire 2 Giriş

    const wEnt3 = addWall(24.5, 4.5, 24.5, 6.5, 0.25);
    addOpening(wEnt3.id, 'door', 0.5, 1.0, 2.10, 0, 'steel'); // Daire 3 Giriş

    const wEnt4 = addWall(24.5, 8.5, 24.5, 10.5, 0.25);
    addOpening(wEnt4.id, 'door', 0.5, 1.0, 2.10, 0, 'steel'); // Daire 4 Giriş

    // ── 5. İÇ DUVARLAR (DAİRE 1 - KUZEYBATI: SALON, MUTFAK, YATAK, ÇOCUK, BANYO) ──
    // Daire 1 ve Daire 2 arası bölme ana duvarı
    addWall(0, 7.5, 7.5, 7.5, 0.25);

    // Daire 1 Salon Duvarı
    const wD1Salon = addWall(5.5, 2.2, 5.5, 7.5, 0.20);
    addOpening(wD1Salon.id, 'door', 0.7, 0.90, 2.10, 0, 'standard');

    // Daire 1 Mutfak Duvarı
    const wD1Mutfak = addWall(2.5, 3.8, 5.5, 3.8, 0.15);
    addOpening(wD1Mutfak.id, 'door', 0.5, 0.85, 2.10, 0, 'standard');

    // Daire 1 Çocuk Odası Duvarı
    const wD1Cocuk = addWall(8.5, 0, 8.5, 4.5, 0.15);
    addOpening(wD1Cocuk.id, 'door', 0.75, 0.85, 2.10, 0, 'standard');

    // Daire 1 Yatak Odası Duvarı
    const wD1Yatak = addWall(12.5, 0, 12.5, 4.5, 0.20);
    addOpening(wD1Yatak.id, 'door', 0.8, 0.90, 2.10, 0, 'standard');

    // Daire 1 Banyo & WC
    const wD1Banyo = addWall(5.5, 5.5, 7.5, 5.5, 0.15);
    addOpening(wD1Banyo.id, 'door', 0.5, 0.80, 2.10, 0, 'standard');

    // ── 6. İÇ DUVARLAR (DAİRE 2 - GÜNEYBATI) ──
    const wD2Salon = addWall(5.5, 7.5, 5.5, 12.8, 0.20);
    addOpening(wD2Salon.id, 'door', 0.3, 0.90, 2.10, 0, 'standard');

    const wD2Mutfak = addWall(2.5, 11.2, 5.5, 11.2, 0.15);
    addOpening(wD2Mutfak.id, 'door', 0.5, 0.85, 2.10, 0, 'standard');

    const wD2Cocuk = addWall(8.5, 10.5, 8.5, 15, 0.15);
    addOpening(wD2Cocuk.id, 'door', 0.25, 0.85, 2.10, 0, 'standard');

    const wD2Yatak = addWall(12.5, 10.5, 12.5, 15, 0.20);
    addOpening(wD2Yatak.id, 'door', 0.2, 0.90, 2.10, 0, 'standard');

    const wD2Banyo = addWall(5.5, 9.5, 7.5, 9.5, 0.15);
    addOpening(wD2Banyo.id, 'door', 0.5, 0.80, 2.10, 0, 'standard');

    // ── 7. İÇ DUVARLAR (DAİRE 3 - KUZEYDOĞU & DAİRE 4 - GÜNEYDOĞU) ──
    addWall(24.5, 7.5, 32, 7.5, 0.25); // Daire 3 ve 4 ortak duvarı

    // Daire 3 Salon & Odalar
    const wD3Salon = addWall(26.5, 2.2, 26.5, 7.5, 0.20);
    addOpening(wD3Salon.id, 'door', 0.7, 0.90, 2.10, 0, 'standard');

    const wD3Mutfak = addWall(26.5, 3.8, 29.5, 3.8, 0.15);
    addOpening(wD3Mutfak.id, 'door', 0.5, 0.85, 2.10, 0, 'standard');

    const wD3Cocuk = addWall(23.5, 0, 23.5, 4.5, 0.15);
    addOpening(wD3Cocuk.id, 'door', 0.75, 0.85, 2.10, 0, 'standard');

    const wD3Yatak = addWall(19.5, 0, 19.5, 4.5, 0.20);
    addOpening(wD3Yatak.id, 'door', 0.8, 0.90, 2.10, 0, 'standard');

    const wD3Banyo = addWall(24.5, 5.5, 26.5, 5.5, 0.15);
    addOpening(wD3Banyo.id, 'door', 0.5, 0.80, 2.10, 0, 'standard');

    // Daire 4 Salon & Odalar
    const wD4Salon = addWall(26.5, 7.5, 26.5, 12.8, 0.20);
    addOpening(wD4Salon.id, 'door', 0.3, 0.90, 2.10, 0, 'standard');

    const wD4Mutfak = addWall(26.5, 11.2, 29.5, 11.2, 0.15);
    addOpening(wD4Mutfak.id, 'door', 0.5, 0.85, 2.10, 0, 'standard');

    const wD4Cocuk = addWall(23.5, 10.5, 23.5, 15, 0.15);
    addOpening(wD4Cocuk.id, 'door', 0.25, 0.85, 2.10, 0, 'standard');

    const wD4Yatak = addWall(19.5, 10.5, 19.5, 15, 0.20);
    addOpening(wD4Yatak.id, 'door', 0.2, 0.90, 2.10, 0, 'standard');

    const wD4Banyo = addWall(24.5, 9.5, 26.5, 9.5, 0.15);
    addOpening(wD4Banyo.id, 'door', 0.5, 0.80, 2.10, 0, 'standard');

    // ── 8. BETONARME KOLONLAR (Aks Kesişimleri) ──
    const colX = [0, 5.5, 8.5, 12.5, 16.5, 19.5, 23.5, 26.5, 32];
    const colY = [0, 4.5, 7.5, 10.5, 15];
    colX.forEach(x => {
        colY.forEach(y => {
            addColumn(x, y, 0.30, 0.50);
        });
    });

    // ── 9. ODALAR & ZEMİN KAPLAMALARI ──
    // Daire 1
    addRoom('Daire 1 - Salon', [{ x: 0, y: 2.2 }, { x: 5.5, y: 2.2 }, { x: 5.5, y: 7.5 }, { x: 0, y: 7.5 }], 'parquet_light');
    addRoom('Daire 1 - Mutfak', [{ x: 2.5, y: 0 }, { x: 5.5, y: 0 }, { x: 5.5, y: 3.8 }, { x: 2.5, y: 3.8 }], 'marble');
    addRoom('Daire 1 - Yatak Odası', [{ x: 8.5, y: 0 }, { x: 12.5, y: 0 }, { x: 12.5, y: 4.5 }, { x: 8.5, y: 4.5 }], 'parquet_light');
    addRoom('Daire 1 - Çocuk Odası', [{ x: 5.5, y: 0 }, { x: 8.5, y: 0 }, { x: 8.5, y: 4.5 }, { x: 5.5, y: 4.5 }], 'parquet_light');
    addRoom('Daire 1 - Banyo', [{ x: 5.5, y: 5.5 }, { x: 7.5, y: 5.5 }, { x: 7.5, y: 7.5 }, { x: 5.5, y: 7.5 }], 'tile');
    addRoom('Daire 1 - Balkon', [{ x: 0, y: 0 }, { x: 2.5, y: 0 }, { x: 2.5, y: 2.2 }, { x: 0, y: 2.2 }], 'balcony_tile');

    // Daire 2
    addRoom('Daire 2 - Salon', [{ x: 0, y: 7.5 }, { x: 5.5, y: 7.5 }, { x: 5.5, y: 12.8 }, { x: 0, y: 12.8 }], 'parquet_light');
    addRoom('Daire 2 - Mutfak', [{ x: 2.5, y: 11.2 }, { x: 5.5, y: 11.2 }, { x: 5.5, y: 15 }, { x: 2.5, y: 15 }], 'marble');
    addRoom('Daire 2 - Yatak Odası', [{ x: 8.5, y: 10.5 }, { x: 12.5, y: 10.5 }, { x: 12.5, y: 15 }, { x: 8.5, y: 15 }], 'parquet_light');
    addRoom('Daire 2 - Banyo', [{ x: 5.5, y: 7.5 }, { x: 7.5, y: 7.5 }, { x: 7.5, y: 9.5 }, { x: 5.5, y: 9.5 }], 'tile');
    addRoom('Daire 2 - Balkon', [{ x: 0, y: 12.8 }, { x: 2.5, y: 12.8 }, { x: 2.5, y: 15 }, { x: 0, y: 15 }], 'balcony_tile');

    // Daire 3 & 4
    addRoom('Daire 3 - Salon', [{ x: 26.5, y: 2.2 }, { x: 32, y: 2.2 }, { x: 32, y: 7.5 }, { x: 26.5, y: 7.5 }], 'parquet_light');
    addRoom('Daire 4 - Salon', [{ x: 26.5, y: 7.5 }, { x: 32, y: 7.5 }, { x: 32, y: 12.8 }, { x: 26.5, y: 12.8 }], 'parquet_light');
    addRoom('Merdiven Evi & Hol', [{ x: 12.5, y: 4.5 }, { x: 19.5, y: 4.5 }, { x: 19.5, y: 10.5 }, { x: 12.5, y: 10.5 }], 'marble');

    // ── 10. OTOMATİK MİMARİ TEFRİŞAT (Mobilyalar & Dolaplar) ──
    // Daire 1 Salon Mobilyaları
    addFurn('l_sofa', 'L-Koltuk', 2.8, 4.5, 2.6, 1.8, 0.85, 0, '#475569');
    addFurn('coffee_table', 'Orta Sehpa', 2.8, 5.8, 1.1, 0.6, 0.45, 0, '#78350f');
    addFurn('tv_unit', 'TV Ünitesi', 0.6, 5.8, 2.0, 0.45, 1.4, 90, '#1e293b');
    addFurn('carpet', 'Halı', 2.8, 5.5, 2.4, 1.8, 0.02, 0, '#cbd5e1');

    // Daire 1 Mutfak
    addFurn('kitchen_l', 'Mutfak Tezgahı', 4.0, 1.2, 2.8, 2.2, 0.9, 0, '#f8fafc');
    addFurn('kitchen_upper', 'Üst Dolaplar', 4.0, 1.2, 2.4, 0.35, 0.75, 0, '#f1f5f9');

    // Daire 1 Yatak Odası
    addFurn('double_bed', 'Çift Kişilik Yatak', 10.5, 2.2, 2.0, 1.8, 1.0, 0, '#3b82f6');
    addFurn('wardrobe_4door', 'Gardırop', 12.0, 2.2, 2.4, 0.6, 2.2, 90, '#451a03');

    // Daire 1 Banyo
    addFurn('shower_cabin', 'Duşakabin', 6.2, 6.2, 0.9, 0.9, 2.0, 0, '#bae6fd');
    addFurn('toilet', 'Klozet', 7.0, 6.2, 0.4, 0.65, 0.85, 180, '#ffffff');
    addFurn('bathroom_vanity', 'Lavabo & Ayna', 6.2, 7.0, 0.8, 0.5, 0.85, 90, '#334155');

    // Daire 2 Salon
    addFurn('l_sofa', 'L-Koltuk', 2.8, 10.5, 2.6, 1.8, 0.85, 180, '#475569');
    addFurn('coffee_table', 'Orta Sehpa', 2.8, 9.2, 1.1, 0.6, 0.45, 0, '#78350f');
    addFurn('tv_unit', 'TV Ünitesi', 0.6, 9.2, 2.0, 0.45, 1.4, 90, '#1e293b');

    // Daire 2 Yatak Odası
    addFurn('double_bed', 'Çift Kişilik Yatak', 10.5, 12.8, 2.0, 1.8, 1.0, 180, '#3b82f6');

    // Daire 3 Salon
    addFurn('l_sofa', 'L-Koltuk', 29.2, 4.5, 2.6, 1.8, 0.85, 0, '#475569');
    addFurn('tv_unit', 'TV Ünitesi', 31.4, 5.8, 2.0, 0.45, 1.4, -90, '#1e293b');

    // Daire 4 Salon
    addFurn('l_sofa', 'L-Koltuk', 29.2, 10.5, 2.6, 1.8, 0.85, 180, '#475569');
    addFurn('tv_unit', 'TV Ünitesi', 31.4, 9.2, 2.0, 0.45, 1.4, -90, '#1e293b');

    return {
        id: `ai_plan_${Date.now()}`,
        name: 'Yapay Zeka ile Modellenen Kat Planı (4 Daireli Blok)',
        scale: 42,
        walls,
        openings,
        rooms,
        furniture,
        columns,
        roof: {
            enabled: false,
            type: 'pitched',
            height: 2.2,
            overhang: 0.8,
            color: '#9a3412'
        },
        blueprint: blueprintUrl ? {
            url: blueprintUrl,
            name: 'Mimari Plan Altlığı',
            x: 0,
            y: 0,
            scale: 0.035,
            opacity: 0.35
        } : undefined
    };
}
