// Dosya yükleme bölümü - ApartmentModal'a eklenecek
// Bu kodu ApartmentModal.tsx'in form içine, müşteri bilgileri bölümünden önce ekle

{
    editingApartmentId && (
        <div style={{ padding: 'var(--spacing-md)', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
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
                            // Refresh apartments
                            const allApartments = await apartmentService.getApartments();
                            setApartments(allApartments.filter(a => a.project_id === id));
                            alert('Dosya yüklendi!');
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
                    cursor: 'pointer'
                }}
            />

            {/* Uploaded Files List */}
            {apartmentFormData.plan_files && apartmentFormData.plan_files.length > 0 && (
                <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                    {apartmentFormData.plan_files.map((file: any) => (
                        <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'white', borderRadius: '4px' }}>
                            <span>{file.type === 'pdf' ? '📄' : file.type === 'dwg' ? '📐' : '🖼️'}</span>
                            <span style={{ flex: 1, fontSize: '12px' }}>{file.name}</span>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (confirm('Dosyayı sil?') && editingApartmentId) {
                                        try {
                                            await apartmentService.removePlanFile(editingApartmentId, file.id);
                                            const allApartments = await apartmentService.getApartments();
                                            setApartments(allApartments.filter(a => a.project_id === id));
                                        } catch (error: any) {
                                            alert(`Hata: ${error.message}`);
                                        }
                                    }
                                }}
                                style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                            >
                                Sil
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
