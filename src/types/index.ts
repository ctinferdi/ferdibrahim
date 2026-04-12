// User types
export interface User {
    id: string;
    email: string;
    displayName?: string;
    created_at?: string;
    company_name?: string;
    company_address?: string;
    company_location?: string;
    whatsapp_number?: string;
    notification_emails?: string[];
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
    project_id?: string;
    partner_id?: string;
    payment_method?: string;
    recipient?: string;
    created_by_email?: string;
}

export type ExpenseInput = Omit<Expense, 'id' | 'user_id' | 'created_at'>;

// Check types
export type CheckStatus = 'pending' | 'paid';

export interface Check {
    id: string;
    check_number: string;
    amount: number;
    company: string;
    category: string;
    vat_status?: string;
    issuer: string;
    given_date: string;
    due_date: string;
    status: CheckStatus;
    description?: string;
    project_id?: string;
    notification_email?: string;
    notification_email_2?: string;
    notification_email_3?: string;
    created_by_email?: string;
    user_id?: string;
    created_at?: string;
}

export type CheckInput = Omit<Check, 'id' | 'user_id' | 'created_at'>;

// Apartment types
export type ApartmentStatus = 'available' | 'sold' | 'owner' | 'common';

export interface PlanFile {
    id: string;
    name: string;
    url: string;
    type: 'pdf' | 'image' | 'dwg';
    uploaded_at: string;
}

export interface Apartment {
    id: string;
    building_name: string;
    apartment_number: string;
    floor: number;
    square_meters: number;
    price: number;
    sold_price?: number;
    paid_amount?: number;
    status: ApartmentStatus;
    customer_name?: string;
    customer_phone?: string;
    sort_order?: number;
    plan_files?: PlanFile[];
    project_id?: string;
    user_id?: string;
    created_at?: string;
}

export type ApartmentInput = Omit<Apartment, 'id' | 'user_id' | 'created_at'>;

// Project types
export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface ProjectImage {
    id: string;
    project_id: string;
    url: string;
    storage_path?: string;
    name?: string;
    created_at?: string;
}

export interface ProjectPartner {
    id: string;
    project_id: string;
    name: string;
    share_percentage: number;
    email?: string;
    created_at?: string;
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    status: ProjectStatus;
    slug?: string;
    public_code?: string;
    company_name?: string;
    company_address?: string;
    company_location?: string;
    whatsapp_number?: string;
    notification_emails?: string[];
    user_id?: string;
    created_at?: string;
    partners?: ProjectPartner[];
}

export type ProjectInput = Omit<Project, 'id' | 'user_id' | 'created_at' | 'partners'>;
export type ProjectPartnerInput = Omit<ProjectPartner, 'id' | 'created_at'>;
