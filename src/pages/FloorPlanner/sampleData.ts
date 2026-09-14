import { FurnitureItem, FloorPlanData } from './types';

export interface CatalogItem {
    type: string;
    category: 'living' | 'kitchen' | 'bedroom' | 'bathroom' | 'dining';
    name: string;
    width: number;
    depth: number;
    height: number;
    color: string;
    icon: string;
}

export const CATALOG_ITEMS: CatalogItem[] = [
    // Oturma Odası
    {
        type: 'l_sofa',
        category: 'living',
        name: 'L-Koltuk Köşe Takımı',
        width: 2.6,
        depth: 1.8,
        height: 0.85,
        color: '#475569',
        icon: '🛋️'
    },
    {
        type: 'sofa_3seater',
        category: 'living',
        name: '3\'lü Modern Kanepe',
        width: 2.2,
        depth: 0.9,
        height: 0.85,
        color: '#334155',
        icon: '🛋️'
    },
    {
        type: 'armchair',
        category: 'living',
        name: 'Tekli Berjer',
        width: 0.85,
        depth: 0.85,
        height: 0.85,
        color: '#d97706',
        icon: '🪑'
    },
    {
        type: 'coffee_table',
        category: 'living',
        name: 'Orta Sehpa (Ahşap & Metal)',
        width: 1.1,
        depth: 0.6,
        height: 0.45,
        color: '#78350f',
        icon: '🪵'
    },
    {
        type: 'tv_unit',
        category: 'living',
        name: 'TV Ünitesi & Geniş Ekran TV',
        width: 2.0,
        depth: 0.45,
        height: 1.4,
        color: '#1e293b',
        icon: '📺'
    },
    {
        type: 'carpet',
        category: 'living',
        name: 'Tasarım Salon Halısı',
        width: 2.8,
        depth: 2.0,
        height: 0.02,
        color: '#cbd5e1',
        icon: '⬛'
    },

    // Mutfak & Yemek
    {
        type: 'kitchen_l',
        category: 'kitchen',
        name: 'L-Mutfak Tezgahı & Evye',
        width: 2.8,
        depth: 2.2,
        height: 0.9,
        color: '#f8fafc',
        icon: '🍳'
    },
    {
        type: 'kitchen_straight',
        category: 'kitchen',
        name: 'Düz Mutfak Tezgahı',
        width: 2.4,
        depth: 0.6,
        height: 0.9,
        color: '#f8fafc',
        icon: '🍳'
    },
    {
        type: 'fridge',
        category: 'kitchen',
        name: 'Çift Kapılı No-Frost Buzdolabı',
        width: 0.8,
        depth: 0.75,
        height: 1.85,
        color: '#94a3b8',
        icon: '🧊'
    },
    {
        type: 'dining_table',
        category: 'dining',
        name: 'Yemek Masası & 4 Sandalye',
        width: 1.6,
        depth: 0.9,
        height: 0.76,
        color: '#b45309',
        icon: '🪑'
    },

    // Yatak Odası
    {
        type: 'double_bed',
        category: 'bedroom',
        name: 'Çift Kişilik Lüks Yatak & Başlık',
        width: 1.8,
        depth: 2.1,
        height: 1.1,
        color: '#e2e8f0',
        icon: '🛏️'
    },
    {
        type: 'single_bed',
        category: 'bedroom',
        name: 'Tek Kişilik Genç Yatağı',
        width: 1.0,
        depth: 2.0,
        height: 0.9,
        color: '#e2e8f0',
        icon: '🛏️'
    },
    {
        type: 'nightstand',
        category: 'bedroom',
        name: 'Komodin',
        width: 0.5,
        depth: 0.45,
        height: 0.55,
        color: '#78350f',
        icon: '🗄️'
    },
    {
        type: 'wardrobe',
        category: 'bedroom',
        name: 'Sürgülü Geniş Gardırop',
        width: 2.2,
        depth: 0.65,
        height: 2.2,
        color: '#334155',
        icon: '🚪'
    },
    {
        type: 'desk',
        category: 'bedroom',
        name: 'Çalışma Masası',
        width: 1.2,
        depth: 0.6,
        height: 0.75,
        color: '#94a3b8',
        icon: '🖥️'
    },

    // Banyo
    {
        type: 'bathroom_vanity',
        category: 'bathroom',
        name: 'Hilton Banyo Dolabı & Ayna',
        width: 1.0,
        depth: 0.5,
        height: 1.8,
        color: '#f8fafc',
        icon: '🪞'
    },
    {
        type: 'toilet',
        category: 'bathroom',
        name: 'Gömme Rezervuar Asma Klozet',
        width: 0.4,
        depth: 0.6,
        height: 0.8,
        color: '#ffffff',
        icon: '🚽'
    },
    {
        type: 'shower_cabin',
        category: 'bathroom',
        name: 'Temperli Cam Duşakabin',
        width: 1.0,
        depth: 1.0,
        height: 2.0,
        color: '#38bdf8',
        icon: '🚿'
    }
];

// Örnek 2+1 Lüks Daire Planı
export const SAMPLE_APARTMENT: FloorPlanData = {
    id: 'sample-2plus1-luxury',
    name: 'Örnek 2+1 Lüks Daire Planı (115 m²)',
    scale: 45, // 1 metre = 45 px
    walls: [
        // Dış Duvarlar (Perimeter)
        { id: 'w_ext_top', start: { x: 0, y: 0 }, end: { x: 11, y: 0 }, thickness: 0.25, height: 2.8 },
        { id: 'w_ext_right', start: { x: 11, y: 0 }, end: { x: 11, y: 8 }, thickness: 0.25, height: 2.8 },
        { id: 'w_ext_bottom', start: { x: 11, y: 8 }, end: { x: 0, y: 8 }, thickness: 0.25, height: 2.8 },
        { id: 'w_ext_left', start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, thickness: 0.25, height: 2.8 },

        // İç Bölme Duvarları (Interior)
        // Salon & Mutfak bölmesi (x=6.2)
        { id: 'w_int_1', start: { x: 6.2, y: 0 }, end: { x: 6.2, y: 5.2 }, thickness: 0.15, height: 2.8 },
        // Koridor & Odalar yatay bölme (y=5.2)
        { id: 'w_int_2', start: { x: 0, y: 5.2 }, end: { x: 6.2, y: 5.2 }, thickness: 0.15, height: 2.8 },
        // Yatak Odası 1 & 2 dikey bölme (x=3.2)
        { id: 'w_int_3', start: { x: 3.2, y: 5.2 }, end: { x: 3.2, y: 8 }, thickness: 0.15, height: 2.8 },
        // Banyo dikey bölme (x=8.5, y=5.2'den y=8'e)
        { id: 'w_int_4', start: { x: 8.5, y: 5.2 }, end: { x: 8.5, y: 8 }, thickness: 0.15, height: 2.8 },
        { id: 'w_int_5', start: { x: 6.2, y: 5.2 }, end: { x: 11, y: 5.2 }, thickness: 0.15, height: 2.8 },
    ],
    openings: [
        // Pencereler
        { id: 'op_win_salon', wallId: 'w_ext_right', type: 'window', position: 0.25, width: 1.8, height: 1.5, sillHeight: 0.8 },
        { id: 'op_win_kitchen', wallId: 'w_ext_top', type: 'window', position: 0.8, width: 1.4, height: 1.3, sillHeight: 0.9 },
        { id: 'op_win_bed1', wallId: 'w_ext_bottom', type: 'window', position: 0.15, width: 1.5, height: 1.4, sillHeight: 0.9 },
        { id: 'op_win_bed2', wallId: 'w_ext_bottom', type: 'window', position: 0.45, width: 1.4, height: 1.4, sillHeight: 0.9 },

        // Kapılar
        { id: 'op_door_main', wallId: 'w_ext_top', type: 'door', position: 0.35, width: 1.0, height: 2.1, sillHeight: 0 },
        { id: 'op_door_salon', wallId: 'w_int_1', type: 'door', position: 0.7, width: 0.9, height: 2.1, sillHeight: 0 },
        { id: 'op_door_bed1', wallId: 'w_int_2', type: 'door', position: 0.25, width: 0.85, height: 2.1, sillHeight: 0 },
        { id: 'op_door_bed2', wallId: 'w_int_2', type: 'door', position: 0.75, width: 0.85, height: 2.1, sillHeight: 0 },
        { id: 'op_door_bath', wallId: 'w_int_5', type: 'door', position: 0.5, width: 0.8, height: 2.1, sillHeight: 0 },
    ],
    rooms: [
        {
            id: 'room_salon',
            name: 'Salon & Açık Mutfak (38 m²)',
            points: [
                { x: 6.2, y: 0 }, { x: 11, y: 0 },
                { x: 11, y: 5.2 }, { x: 6.2, y: 5.2 }
            ],
            floorType: 'parquet_light'
        },
        {
            id: 'room_master_bed',
            name: 'Ebeveyn Yatak Odası (22 m²)',
            points: [
                { x: 0, y: 5.2 }, { x: 3.2, y: 5.2 },
                { x: 3.2, y: 8 }, { x: 0, y: 8 }
            ],
            floorType: 'parquet_light'
        },
        {
            id: 'room_child_bed',
            name: 'Çocuk / Misafir Odası (18 m²)',
            points: [
                { x: 3.2, y: 5.2 }, { x: 6.2, y: 5.2 },
                { x: 6.2, y: 8 }, { x: 3.2, y: 8 }
            ],
            floorType: 'parquet_light'
        },
        {
            id: 'room_bathroom',
            name: 'Genel Banyo & WC (12 m²)',
            points: [
                { x: 8.5, y: 5.2 }, { x: 11, y: 5.2 },
                { x: 11, y: 8 }, { x: 8.5, y: 8 }
            ],
            floorType: 'marble'
        },
        {
            id: 'room_hall',
            name: 'Antre & Hol (16 m²)',
            points: [
                { x: 0, y: 0 }, { x: 6.2, y: 0 },
                { x: 6.2, y: 5.2 }, { x: 0, y: 5.2 }
            ],
            floorType: 'tile'
        }
    ],
    furniture: [
        // Salondaki Mobilyalar
        {
            id: 'f_l_sofa',
            type: 'l_sofa',
            category: 'living',
            name: 'L-Koltuk Köşe Takımı',
            x: 9.5,
            y: 3.6,
            rotation: 180,
            width: 2.6,
            depth: 1.8,
            height: 0.85,
            color: '#475569'
        },
        {
            id: 'f_coffee_table',
            type: 'coffee_table',
            category: 'living',
            name: 'Orta Sehpa',
            x: 8.5,
            y: 3.2,
            rotation: 0,
            width: 1.1,
            depth: 0.6,
            height: 0.45,
            color: '#78350f'
        },
        {
            id: 'f_tv_unit',
            type: 'tv_unit',
            category: 'living',
            name: 'TV Ünitesi & TV',
            x: 7.2,
            y: 3.2,
            rotation: 90,
            width: 2.0,
            depth: 0.45,
            height: 1.4,
            color: '#1e293b'
        },
        {
            id: 'f_carpet_salon',
            type: 'carpet',
            category: 'living',
            name: 'Salon Halısı',
            x: 8.8,
            y: 3.2,
            rotation: 0,
            width: 2.5,
            depth: 1.8,
            height: 0.02,
            color: '#cbd5e1'
        },
        // Mutfak Tezgahı & Buzdolabı & Yemek Masası
        {
            id: 'f_kitchen_l',
            type: 'kitchen_l',
            category: 'kitchen',
            name: 'L-Mutfak Tezgahı',
            x: 9.5,
            y: 1.2,
            rotation: 0,
            width: 2.8,
            depth: 2.2,
            height: 0.9,
            color: '#f8fafc'
        },
        {
            id: 'f_fridge',
            type: 'fridge',
            category: 'kitchen',
            name: 'Buzdolabı',
            x: 6.8,
            y: 0.6,
            rotation: 0,
            width: 0.8,
            depth: 0.75,
            height: 1.85,
            color: '#94a3b8'
        },
        {
            id: 'f_dining_table',
            type: 'dining_table',
            category: 'dining',
            name: 'Yemek Masası',
            x: 7.5,
            y: 1.8,
            rotation: 0,
            width: 1.5,
            depth: 0.9,
            height: 0.76,
            color: '#b45309'
        },

        // Ebeveyn Yatak Odası
        {
            id: 'f_master_bed',
            type: 'double_bed',
            category: 'bedroom',
            name: 'Çift Kişilik Lüks Yatak',
            x: 1.6,
            y: 6.8,
            rotation: 180,
            width: 1.8,
            depth: 2.1,
            height: 1.1,
            color: '#e2e8f0'
        },
        {
            id: 'f_wardrobe_master',
            type: 'wardrobe',
            category: 'bedroom',
            name: 'Gardırop',
            x: 1.6,
            y: 5.6,
            rotation: 0,
            width: 2.2,
            depth: 0.65,
            height: 2.2,
            color: '#334155'
        },

        // Çocuk Odası
        {
            id: 'f_single_bed',
            type: 'single_bed',
            category: 'bedroom',
            name: 'Tek Kişilik Yatak',
            x: 4.8,
            y: 7.0,
            rotation: 180,
            width: 1.0,
            depth: 2.0,
            height: 0.9,
            color: '#e2e8f0'
        },
        {
            id: 'f_desk_child',
            type: 'desk',
            category: 'bedroom',
            name: 'Çalışma Masası',
            x: 4.8,
            y: 5.6,
            rotation: 0,
            width: 1.2,
            depth: 0.6,
            height: 0.75,
            color: '#94a3b8'
        },

        // Banyo
        {
            id: 'f_shower',
            type: 'shower_cabin',
            category: 'bathroom',
            name: 'Duşakabin',
            x: 10.3,
            y: 7.3,
            rotation: 0,
            width: 1.0,
            depth: 1.0,
            height: 2.0,
            color: '#38bdf8'
        },
        {
            id: 'f_toilet',
            type: 'toilet',
            category: 'bathroom',
            name: 'Asma Klozet',
            x: 9.2,
            y: 7.5,
            rotation: 180,
            width: 0.4,
            depth: 0.6,
            height: 0.8,
            color: '#ffffff'
        },
        {
            id: 'f_vanity',
            type: 'bathroom_vanity',
            category: 'bathroom',
            name: 'Banyo Dolabı',
            x: 9.8,
            y: 5.7,
            rotation: 0,
            width: 1.0,
            depth: 0.5,
            height: 1.8,
            color: '#f8fafc'
        }
    ]
};
