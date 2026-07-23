// กรอบฝังโมดูล — iframe เต็มพื้นที่ใต้แถบบน
export default function ModuleFrame({ src, title }: { src: string; title: string }) {
  return (
    <iframe
      src={src}
      title={title}
      style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      // อนุญาต feature ที่แอปในกรอบอาจต้องใช้ (popup login, storage)
      allow="clipboard-read; clipboard-write"
    />
  );
}
