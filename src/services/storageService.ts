import { publicSupabase, supabase } from '../config/supabase';
import { PlanFile } from '../types';

const ALLOWED_PLAN_EXTENSIONS = ['pdf', 'dwg', 'jpg', 'jpeg', 'png', 'tiff', 'tif'];
const ALLOWED_PROJECT_MEDIA_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'm4v', 'mov', 'webm'];
export const MAX_PROJECT_MEDIA_SIZE = 10 * 1024 * 1024;

class StorageService {
    private bucketName = 'apartment-plans';

    private resolveObjectPath(reference?: string | null): string | null {
        if (!reference) return null;
        if (!reference.includes('://')) return reference;

        try {
            const pathname = new URL(reference).pathname;
            const marker = `/storage/v1/object/public/${this.bucketName}/`;
            const markerIndex = pathname.indexOf(marker);
            if (markerIndex === -1) return null;
            return pathname.slice(markerIndex + marker.length)
                .split('/')
                .map(segment => decodeURIComponent(segment))
                .join('/');
        } catch {
            return null;
        }
    }

    isManagedObjectReference(reference?: string | null): boolean {
        return this.resolveObjectPath(reference) !== null;
    }

    async createSignedUrl(reference: string, publicProject = false): Promise<string | null> {
        const objectPath = this.resolveObjectPath(reference);
        if (!objectPath) return null;

        const client = publicProject ? publicSupabase : supabase;
        const { data, error } = await client.storage
            .from(this.bucketName)
            .createSignedUrl(objectPath, 60 * 60);

        if (error) throw error;
        return data.signedUrl;
    }

    async uploadFile(file: File, apartmentId: string): Promise<PlanFile> {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

        if (!ALLOWED_PLAN_EXTENSIONS.includes(fileExt)) {
            throw new Error(`Desteklenmeyen dosya türü: .${fileExt}. İzin verilenler: ${ALLOWED_PLAN_EXTENSIONS.join(', ')}`);
        }

        const fileName = `${apartmentId}/${Date.now()}.${fileExt}`;

        const { error } = await supabase.storage
            .from(this.bucketName)
            .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from(this.bucketName)
            .getPublicUrl(fileName);

        let fileType: 'pdf' | 'image' | 'dwg' = 'image';
        if (fileExt === 'pdf') fileType = 'pdf';
        else if (fileExt === 'dwg') fileType = 'dwg';

        return {
            id: crypto.randomUUID(),
            name: file.name,
            url: publicUrl,
            storage_path: fileName,
            type: fileType,
            uploaded_at: new Date().toISOString()
        };
    }

    async deleteFile(filePath: string): Promise<void> {
        const { error } = await supabase.storage
            .from(this.bucketName)
            .remove([filePath]);

        if (error) throw error;
    }

    getFileUrl(filePath: string): string {
        const { data } = supabase.storage
            .from(this.bucketName)
            .getPublicUrl(filePath);

        return data.publicUrl;
    }

    async uploadProjectMedia(file: File, projectId: string): Promise<{ url: string; path: string }> {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

        if (!ALLOWED_PROJECT_MEDIA_EXTENSIONS.includes(fileExt)) {
            throw new Error(`Desteklenmeyen dosya türü: .${fileExt}. İzin verilenler: ${ALLOWED_PROJECT_MEDIA_EXTENSIONS.join(', ')}`);
        }

        const fileName = `project-images/${projectId}/${Date.now()}.${fileExt}`;

        const { error } = await supabase.storage
            .from(this.bucketName)
            .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from(this.bucketName)
            .getPublicUrl(fileName);

        return { url: publicUrl, path: fileName };
    }

    async uploadProjectImage(file: File, projectId: string): Promise<{ url: string; path: string }> {
        return this.uploadProjectMedia(file, projectId);
    }

    async deleteProjectImageFromStorage(storagePath: string): Promise<void> {
        try {
            await supabase.storage.from(this.bucketName).remove([storagePath]);
        } catch (e) {
            console.warn('Storage file deletion failed, orphaned object:', storagePath, e);
        }
    }
}

export const storageService = new StorageService();
