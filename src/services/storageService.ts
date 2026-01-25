import { supabase } from '../config/supabase';
import { PlanFile } from '../types';

class StorageService {
    private bucketName = 'apartment-plans';

    // Upload file to Supabase Storage
    async uploadFile(file: File, apartmentId: string): Promise<PlanFile> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${apartmentId}/${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from(this.bucketName)
            .upload(fileName, file);

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(this.bucketName)
            .getPublicUrl(fileName);

        // Determine file type
        let fileType: 'pdf' | 'image' | 'dwg' = 'image';
        const lowerExt = fileExt?.toLowerCase();
        if (lowerExt === 'pdf') fileType = 'pdf';
        else if (lowerExt === 'dwg') fileType = 'dwg';
        else if (['jpg', 'jpeg', 'png', 'tiff', 'tif'].includes(lowerExt || '')) fileType = 'image';

        return {
            id: crypto.randomUUID(),
            name: file.name,
            url: publicUrl,
            type: fileType,
            uploaded_at: new Date().toISOString()
        };
    }

    // Delete file from storage
    async deleteFile(filePath: string): Promise<void> {
        const { error } = await supabase.storage
            .from(this.bucketName)
            .remove([filePath]);

        if (error) throw error;
    }

    // Get file URL from path
    getFileUrl(filePath: string): string {
        const { data } = supabase.storage
            .from(this.bucketName)
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
}

export const storageService = new StorageService();
