# ApartmentModal'a FileUploadSection Ekleme

## Adım 1: ApartmentModal.tsx dosyasını aç

`src/pages/ProjectDetail/Modals/ApartmentModal.tsx`

## Adım 2: Form içinde müşteri bilgileri bölümünden ÖNCE şunu ekle:

Dosyada "Müşteri Adı" veya "customer_name" yazan yeri bul.
Ondan ÖNCE şu kodu ekle:

```tsx
<FileUploadSection
    editingApartmentId={editingApartmentId}
    apartmentFormData={apartmentFormData}
    setApartments={setApartments}
    projectId={id}
/>
```

## Örnek:

```tsx
{/* ... diğer form alanları ... */}

{/* BURAYA EKLE */}
<FileUploadSection
    editingApartmentId={editingApartmentId}
    apartmentFormData={apartmentFormData}
    setApartments={setApartments}
    projectId={id}
/>

{/* Müşteri bilgileri */}
<div>
    <label>Müşteri Adı</label>
    ...
</div>
```

Hepsi bu kadar! 🚀
