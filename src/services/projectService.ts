import { supabase } from '../config/supabase';
import { Project, ProjectInput, ProjectPartner, ProjectPartnerInput } from '../types';

const toTurkishUpperCase = (str: string) => {
    return str
        .replace(/i/g, 'İ')
        .replace(/ı/g, 'I')
        .toUpperCase();
};

// Helper: Slugify
const slugify = (text: string): string => {
    const trMap: { [key: string]: string } = {
        'ç': 'c', 'Ç': 'C',
        'ğ': 'g', 'Ğ': 'G',
        'ş': 's', 'Ş': 'S',
        'ü': 'u', 'Ü': 'U',
        'ı': 'i', 'İ': 'I',
        'ö': 'o', 'Ö': 'O'
    };
    return text
        .split('')
        .map(char => trMap[char] || char)
        .join('')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

class ProjectService {
    // Get all projects for current user
    async getProjects(): Promise<Project[]> {
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                partners:project_partners(*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    // Get single project with partners
    async getProject(id: string): Promise<Project | null> {
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                partners:project_partners(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    // Get project by slug (or ID fallback)
    // Get project by slug (or ID fallback)
    async getProjectBySlug(slugOrId: string): Promise<Project | null> {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

        let query = supabase
            .from('projects')
            .select(`
                *,
                partners:project_partners(*)
            `);

        if (isUUID) {
            // It's a UUID, so it could be an ID OR a slug (rare but possible)
            query = query.or(`id.eq.${slugOrId},slug.eq.${slugOrId}`);
        } else {
            // Not a UUID, so it MUST be a slug
            query = query.eq('slug', slugOrId);
        }

        const { data, error } = await query.single();

        if (error) {
            // Postgres returns code PGRST116 when no rows are found with .single()
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return data;
    }

    // Get project by public code (for public viewing)
    async getProjectByPublicCode(publicCode: string): Promise<Project | null> {
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                partners:project_partners(*)
            `)
            .eq('public_code', publicCode)
            .single();

        if (error) throw error;
        return data;
    }

    // Create new project
    async createProject(project: ProjectInput): Promise<Project> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Generate unique public code (8 chars)
        const publicCode = Math.random().toString(36).substring(2, 10);
        // Generate slug
        let slug = slugify(project.name);
        // Ensure slug uniqueness (simple append for now, real prod needs db check loop)
        const checkSlug = await this.getProjectBySlug(slug);
        if (checkSlug) {
            slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
        }

        const { data, error } = await supabase
            .from('projects')
            .insert([{
                ...project,
                name: toTurkishUpperCase(project.name),
                description: project.description ? toTurkishUpperCase(project.description) : '',
                company_name: project.company_name ? toTurkishUpperCase(project.company_name) : '',
                company_address: project.company_address ? toTurkishUpperCase(project.company_address) : '',
                user_id: user.id,
                public_code: publicCode,
                slug
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Update project
    async updateProject(id: string, updates: Partial<ProjectInput>): Promise<Project> {
        const normalizedUpdates = { ...updates };
        if (normalizedUpdates.name) normalizedUpdates.name = toTurkishUpperCase(normalizedUpdates.name);
        if (normalizedUpdates.description) normalizedUpdates.description = toTurkishUpperCase(normalizedUpdates.description);
        if (normalizedUpdates.company_name) normalizedUpdates.company_name = toTurkishUpperCase(normalizedUpdates.company_name);
        if (normalizedUpdates.company_address) normalizedUpdates.company_address = toTurkishUpperCase(normalizedUpdates.company_address);

        const { data, error } = await supabase
            .from('projects')
            .update(normalizedUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Delete project
    async deleteProject(id: string): Promise<void> {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // Add partner to project
    async addPartner(partner: ProjectPartnerInput): Promise<ProjectPartner> {
        const { data, error } = await supabase
            .from('project_partners')
            .insert([partner])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Update partner
    async updatePartner(id: string, updates: Partial<ProjectPartnerInput>): Promise<ProjectPartner> {
        const { data, error } = await supabase
            .from('project_partners')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Delete partner
    async deletePartner(id: string): Promise<void> {
        const { error } = await supabase
            .from('project_partners')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // Subscribe to projects
    subscribeToProjects(callback: (projects: Project[]) => void) {
        this.getProjects().then(callback);

        const subscription = supabase
            .channel('projects')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'projects'
            }, () => {
                this.getProjects().then(callback);
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'project_partners'
            }, () => {
                this.getProjects().then(callback);
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }

    // MIGRATION: Force regenerate all slugs to ensure uniqueness
    async regenerateAllSlugs() {
        // 1. Fetch all projects
        const { data: projects } = await supabase.from('projects').select('*');
        if (!projects || projects.length === 0) return;

        // 2. Track used slugs to handle duplicates in-memory
        const usedSlugs = new Set<string>();

        for (const p of projects) {
            let baseSlug = slugify(p.name);
            let candidate = baseSlug;
            let counter = 1;

            // 3. Ensure uniqueness within this batch
            while (usedSlugs.has(candidate)) {
                counter++;
                candidate = `${baseSlug}-${counter}`;
            }

            usedSlugs.add(candidate);

            // 4. Update if different (or if currently null)
            if (p.slug !== candidate) {
                // Try update, ignore error if it clashes with existing DB logic (should be rare if we do this logic)
                await supabase.from('projects').update({ slug: candidate }).eq('id', p.id);
            }
        }
    }

    // MIGRATION: Fix long public codes (replace UUIDs with 8-char codes)
    async regeneratePublicCodes() {
        const { data: projects } = await supabase.from('projects').select('*');
        if (!projects || projects.length === 0) return;

        for (const p of projects) {
            // If public_code is missing or looks like a UUID (long)
            if (!p.public_code || p.public_code.length > 12) {
                const newCode = Math.random().toString(36).substring(2, 10);
                await supabase.from('projects').update({ public_code: newCode }).eq('id', p.id);
            }
        }
    }
}

export const projectService = new ProjectService();
