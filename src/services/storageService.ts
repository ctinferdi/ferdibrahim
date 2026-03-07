import { supabase } from '../config/supabase';
import { PlanFile } from '../types';

const ALLOWED_PLAN_EXTENSIONS = ['pdf', 'dwg', 'jpg', 'jpeg', 'png', 'tiff', 'tif'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

class StorageService {
    private bucketName = 'apartment-plans';

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

    async uploadProjectImage(file: File, projectId: string): Promise<{ url: string; path: string }> {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

        if (!ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
            throw new Error(`Desteklenmeyen resim türü: .${fileExt}. İzin verilenler: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`);
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

    async deleteProjectImageFromStorage(storagePath: string): Promise<void> {
        try {
            await supabase.storage.from(this.bucketName).remove([storagePath]);
        } catch (e) {
            console.warn('Storage file deletion failed, orphaned object:', storagePath, e);
        }
    }
}

export const storageService = new StorageService();
