export interface Point {
    x: number;
    y: number;
}

export interface Wall {
    id: string;
    start: Point;
    end: Point;
    thickness: number; // in meters, default 0.20
    height?: number;   // in meters, default 2.80
    color?: string;
}

export interface Opening {
    id: string;
    wallId: string;
    type: 'door' | 'window';
    position: number; // 0 to 1 along the wall
    width: number;    // in meters, e.g. 0.90 for door, 1.40 for window
    height: number;   // in meters, e.g. 2.10 for door, 1.30 for window
    sillHeight?: number; // distance from floor, e.g. 0 for door, 0.90 for window
}

export type FloorType = 'parquet_light' | 'parquet_dark' | 'marble' | 'tile' | 'carpet';

export interface Room {
    id: string;
    name: string;
    points: Point[];
    floorType: FloorType;
    color?: string;
}

export type FurnitureCategory = 'living' | 'kitchen' | 'bedroom' | 'bathroom' | 'dining';

export interface FurnitureItem {
    id: string;
    type: string;
    category: FurnitureCategory;
    name: string;
    x: number; // center x in meters
    y: number; // center y in meters (or z in 3D)
    rotation: number; // in degrees, e.g. 0, 90, 180, 270
    width: number;  // in meters (along local X)
    depth: number;  // in meters (along local Y/Z)
    height: number; // in meters
    color?: string;
    icon?: string;
}

export interface FloorPlanData {
    id: string;
    name: string;
    projectId?: string;
    apartmentId?: string;
    walls: Wall[];
    openings: Opening[];
    rooms: Room[];
    furniture: FurnitureItem[];
    scale: number; // pixels per meter in 2D view (e.g. 50)
}
