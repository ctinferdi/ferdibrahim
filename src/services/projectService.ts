import { supabase } from '../config/supabase';
import { Project, ProjectInput, ProjectPartner, ProjectPartnerInput } from '../types';
import { slugify } from '../utils/slugify';

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
    async getProjectBySlug(slugOrId: string): Promise<Project | null> {
        // Try to fetch by slug first
        let { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                partners:project_partners(*)
            `)
            .eq('slug', slugOrId)
            .single();

        // If not found or error, try fetching by ID (if it looks like a uuid)
        if (!data && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId)) {
            const result = await supabase
                .from('projects')
                .select(`
                *,
                partners:project_partners(*)
            `)
                .eq('id', slugOrId)
                .single();
            data = result.data;
            error = result.error;
        }

        if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error for first attempt
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
            .insert([{ ...project, user_id: user.id, public_code: publicCode, slug }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Update project
    async updateProject(id: string, updates: Partial<ProjectInput>): Promise<Project> {
        const { data, error } = await supabase
            .from('projects')
            .update(updates)
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
}

export const projectService = new ProjectService();
