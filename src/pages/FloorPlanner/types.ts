export interface Point {
    x: number;
    y: number;
}

export type WallType = 'standard' | 'low_wall' | 'balcony_glass' | 'balcony_railing';

export interface Wall {
    id: string;
    start: Point;
    end: Point;
    thickness: number; // in meters, e.g. 0.20 or 0.25
    height?: number;   // in meters, default 2.80
    wallType?: WallType;
    color?: string;
}

export type DoorType = 'standard' | 'steel' | 'double_glass' | 'sliding';
export type WindowType = 'standard' | 'french' | 'small';

export interface Opening {
    id: string;
    wallId: string;
    type: 'door' | 'window';
    doorType?: DoorType;
    windowType?: WindowType;
    position: number; // 0 to 1 along the wall
    width: number;    // in meters, e.g. 0.90 for door, 1.40 for window
    height: number;   // in meters, e.g. 2.10 for door, 1.30 for window
    sillHeight?: number; // distance from floor, e.g. 0 for door, 0.90 for window
}

export type FloorType = 'parquet_light' | 'parquet_dark' | 'marble' | 'tile' | 'carpet' | 'balcony_tile';

export interface Room {
    id: string;
    name: string;
    points: Point[];
    floorType: FloorType;
    color?: string;
}

export interface Column {
    id: string;
    x: number;
    y: number;
    width: number; // e.g. 0.30
    depth: number; // e.g. 0.50
    rotation?: number;
    height?: number; // default 2.80
}

export interface Beam {
    id: string;
    start: Point;
    end: Point;
    width: number;  // e.g. 0.25
    dropHeight: number; // e.g. 0.50 below ceiling
}

export interface RoofConfig {
    enabled: boolean;
    type: 'flat' | 'pitched' | 'hip';
    height: number;
    overhang: number;
    color: string;
}

export interface FloorLevel {
    id: string;
    name: string;
    level: number; // 0 = Zemin Kat, 1 = 1. Kat, etc.
    height: number;
}

export interface BlueprintOverlay {
    url: string;
    name?: string;
    x: number;
    y: number;
    scale: number;
    opacity: number;
}

export type FurnitureCategory = 'living' | 'kitchen' | 'bedroom' | 'bathroom' | 'dining' | 'structure';

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
    currentFloorIndex?: number;
    floors?: FloorLevel[];
    walls: Wall[];
    openings: Opening[];
    rooms: Room[];
    furniture: FurnitureItem[];
    columns?: Column[];
    beams?: Beam[];
    roof?: RoofConfig;
    blueprint?: BlueprintOverlay;
    scale: number; // pixels per meter in 2D view (e.g. 50)
}
