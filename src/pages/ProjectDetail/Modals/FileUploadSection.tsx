import React from 'react';
import { apartmentService } from '../../../services/apartmentService';

interface FileUploadSectionProps {
    editingApartmentId: string | null;
    apartmentFormData: any;
    setApartments: (apts: any[]) => void;
    projectId: string;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
    editingApartmentId,
    apartmentFormData,
    setApartments,
    projectId
}) => {
    if (!editingApartmentId) return null;

    return (
        <div style={{ padding: 'var(--spacing-md)', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: 'var(--spacing-sm)' }}>
            <h4 style={{ margin: 0, marginBottom: '12px', fontSize: 'var(--font-size-sm)', color: '#64748b' }}>
                📄 Daire Planları
            </h4>

            {/* File Upload */}
            <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.dwg"
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file && editingApartmentId) {
                        try {
                            await apartmentService.addPlanFile(editingApartmentId, file);
                            const allApartments = await apartmentService.getApartments();
                            setApartments(allApartments.filter(a => a.project_id === projectId));
                            alert('Dosya yüklendi!');
                            e.target.value = ''; // Reset input
                        } catch (error: any) {
                            alert(`Hata: ${error.message}`);
                        }
                    }
                }}
                style={{
                    width: '100%',
                    padding: '8px',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                }}
            />

            {/* Uploaded Files List */}
            {apartmentFormData.plan_files && apartmentFormData.plan_files.length > 0 && (
                <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                    {apartmentFormData.plan_files.map((file: any) => (
                        <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'white', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '18px' }}>
                                {file.type === 'pdf' ? '📄' : file.type === 'dwg' ? '📐' : '🖼️'}
                            </span>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: '12px', fontWeight: 600 }}>{file.name}</p>
                                <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>{file.type.toUpperCase()}</p>
                            </div>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (confirm('Dosyayı sil?') && editingApartmentId) {
                                        try {
                                            await apartmentService.removePlanFile(editingApartmentId, file.id);
                                            const allApartments = await apartmentService.getApartments();
                                            setApartments(allApartments.filter(a => a.project_id === projectId));
                                        } catch (error: any) {
                                            alert(`Hata: ${error.message}`);
                                        }
                                    }
                                }}
                                style={{
                                    padding: '4px 8px',
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: 600
                                }}
                            >
                                Sil
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileUploadSection;
