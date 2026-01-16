// User types
export interface User {
    id: string;
    email: string;
    displayName?: string;
    createdAt: Date;
}

// Expense types
export interface Expense {
    id: string;
    category: string;
    description: string;
    amount: number;
    date: string;
    user_id?: string;
    created_at?: string;
}

export type ExpenseInput = Omit<Expense, 'id' | 'user_id' | 'created_at'>;

// Check types
export type CheckStatus = 'pending' | 'paid' | 'cancelled';

export interface Check {
    id: string;
    recipient: string;
    amount: number;
    due_date: string;
    check_number: string;
    status: CheckStatus;
    user_id?: string;
    created_at?: string;
}

export type CheckInput = Omit<Check, 'id' | 'user_id' | 'created_at'>;

// Apartment types
export type ApartmentStatus = 'available' | 'reserved' | 'sold';

export interface Apartment {
    id: string;
    building_name: string;
    apartment_number: string;
    floor: number;
    square_meters: number;
    price: number;
    status: ApartmentStatus;
    customer_name?: string;
    customer_phone?: string;
    user_id?: string;
    created_at?: string;
}

export type ApartmentInput = Omit<Apartment, 'id' | 'user_id' | 'created_at'>;
