// Gộp 3 bản build thành một site GitHub Pages:
//   /            -> web du khách  (apps/web/dist)
//   /admin/      -> trang quản trị (apps/admin/dist)
//   /mobile/     -> app mobile bản web (apps/mobile/dist, từ `expo export -p web`)
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const BASE = '/CONG_NGHE_PHAN_MEM/'; // phải khớp `base` trong vite.config và experiments.baseUrl trong app.json
const OUT = 'site';

rmSync(OUT, { recursive: true, force: true });
cpSync('apps/web/dist', OUT, { recursive: true });
cpSync('apps/admin/dist', `${OUT}/admin`, { recursive: true });
if (existsSync('apps/mobile/dist')) cpSync('apps/mobile/dist', `${OUT}/mobile`, { recursive: true });
else console.warn('Không thấy apps/mobile/dist, bỏ qua /mobile/');

// 404.html: GitHub Pages chỉ có MỘT file 404 cho cả site.
// - Đường dẫn của web (vd /poi/3 từ mã QR): hiện thẳng index của web (SPA).
// - Đường dẫn con của admin (vd /admin/pois): ghi nhớ rồi chuyển về /admin/, admin tự khôi phục đường dẫn.
const redirect =
  `<script>(function(){var b='${BASE}',p=location.pathname;` +
  `if(p.indexOf(b+'admin/')===0){sessionStorage.setItem('ddl.redirect',p+location.search+location.hash);location.replace(b+'admin/');}` +
  `})();</script>`;
const index = readFileSync(`${OUT}/index.html`, 'utf8');
writeFileSync(`${OUT}/404.html`, index.replace('<head>', `<head>${redirect}`));
console.log('Đã tạo thư mục site/');
