# Dinh Độc Lập Guide – Frontend

Monorepo FE cho PRD "Ứng dụng Thuyết minh Đa ngôn ngữ Dinh Độc Lập" (v1.6).

| Thư mục               | Công nghệ         | Use case                                                                  |
| ----------------------- | ------------------- | ------------------------------------------------------------------------- |
| `apps/web`            | React.js (Vite)     | UC1, UC2, UC3, UC5 – web du khách (`/poi/:id` là đích của mã QR) |
| `apps/mobile`         | React Native (Expo) | UC1, UC2, UC3, UC5 – app du khách                                       |
| `apps/admin`          | React.js (Vite)     | UC6, UC7, UC8 – trang quản trị, chỉ desktop                           |
| `packages/shared`     | TypeScript          | Kiểu dữ liệu, API (Supabase hoặc giả), i18n, trình phát, sự kiện |
| `supabase/schema.sql` | SQL                 | Bảng, phân quyền (RLS), hàm, kho ảnh, dữ liệu mẫu                 |

## Chạy thử (không cần Supabase)

```bash
npm install
npm run dev:web      # http://localhost:5173
npm run dev:admin    # http://localhost:5174  (admin/admin123, editor/editor123, viewer/viewer123)
npm run dev:mobile   # chạy từ thư mục gốc; quét mã QR bằng app Expo Go
npm run typecheck
npm run build
```

## Đối chiếu PRD v1.6 (cập nhật gần nhất)

Đã bổ sung cho khớp PRD: bộ lọc dashboard (7/30/90 ngày, tùy chọn, ngôn ngữ) cùng xử lý mất kết nối và "Chưa có dữ liệu" (UC7); quên mật khẩu, khóa tạm sau 5 lần sai, hết phiên (UC6); thêm điểm, sửa các trường chung (số thứ tự, tên nội bộ, loại, lối xe lăn, vị trí bằng cách chạm bản đồ), thay ảnh, kéo thả sắp xếp ảnh, chú thích ảnh theo ngôn ngữ, tạo mã QR, báo khi hai người cùng sửa, hủy điểm mới, kiểm tra ảnh (≥800px, nội dung thật, tự thu nhỏ/nén), nhật ký có ngôn ngữ (UC8); ghi `poi_open` khi vào bằng QR, đổi ngôn ngữ giữa chừng thì dừng đọc, thư viện ảnh, báo lỗi tải + thử lại, báo thiếu giọng đọc và chạm thanh tiến độ trên mobile (UC1/UC3/UC5).

**Phải chạy lại `supabase/schema.sql`** trên project Supabase hiện có (an toàn khi chạy lại): file thêm cột `poi_versions.meta`, hàm `save_draft`, `create_poi`, `discard_draft` và đổi `get_stats` có tham số lọc.

Biến môi trường mới cho admin: `VITE_WEB_URL` (địa chỉ web du khách, dùng làm gốc đường dẫn trong mã QR). Để liên kết "Quên mật khẩu" hoạt động, thêm `<địa chỉ admin>/reset-password` vào *Authentication → URL Configuration → Redirect URLs* của Supabase.

Chưa làm (ngoài MVP hoặc cần thêm gói): quét camera thật ở mobile (cần `expo-camera`, xem `QrScreen.tsx`), nhiều ảnh bản đồ theo tầng, giao diện sáng/cỡ chữ lớn (UI-05, mức S), khôi phục phiên bản cũ và ngoại tuyến (v1.1).

## Âm thanh = đọc nội dung

Nút **Phát** đọc phần *nội dung thuyết minh* thành tiếng bằng giọng đọc có sẵn của thiết bị (web: Web Speech API, mobile: expo-speech), đọc từng đoạn và tô sáng đoạn đang đọc. Không cần file âm thanh.

- Chất lượng giọng phụ thuộc thiết bị. Nếu máy chưa có giọng cho ngôn ngữ đó (vd tiếng Việt), app báo cho người dùng. Chrome/Edge trên Windows thường có sẵn giọng tiếng Việt; Android và iOS đều có.
- Lượt nghe được tính khi đọc đủ 10 giây (BR-03).

## Nối Supabase

1. Tạo project tại supabase.com.
2. **SQL Editor → New query**, dán toàn bộ `supabase/schema.sql` rồi **Run** (an toàn khi chạy lại). File tạo bảng, phân quyền RLS, các hàm, bucket ảnh `poi-media` và 8 điểm mẫu.
3. **Authentication → Users → Add user**: tạo tài khoản quản trị (email + mật khẩu, tick *Auto Confirm User*). Rồi chạy lệnh cấp vai trò (đổi email):
   ```sql
   insert into public.profiles (id, username, role)
   select id, email, 'admin' from auth.users where email = 'ban@example.com'
   on conflict (id) do update set role = excluded.role;
   ```

   Vai trò: `admin`, `editor` (sửa nội dung, không xem dashboard), `viewer` (chỉ xem dashboard).
4. **Project Settings → API**: chép *Project URL* và *anon public key* vào `apps/web/.env.local` và `apps/admin/.env.local` (xem `.env.example`), mobile dùng biến `EXPO_PUBLIC_*`. Chạy lại `npm run dev:web`.
5. Đăng nhập admin bằng email, vào "Điểm tham quan", sửa và tải ảnh lên, xuất bản.

Điều cần nhớ về bảo mật:

- FE chỉ dùng **anon key**. Không bao giờ đưa `service_role` key vào code hay commit lên Git.
- Du khách (chưa đăng nhập) không đọc bảng trực tiếp; chỉ gọi hàm `get_visitor_pois` và `track_event`. Quyền sửa nội dung và xem dashboard do RLS và hàm ở phía máy chủ kiểm tra, không dựa vào việc FE ẩn nút.
- Hạn chế hiện tại: hàm `track_event` cho phép ai cũng gửi sự kiện nên số liệu có thể bị gửi giả. Nếu cần chặt hơn thì thêm giới hạn tần suất sau.

## Còn là dữ liệu mẫu

- Bản đồ là hình minh hoạ vẽ bằng SVG (`PalaceMapArt.tsx`). Khi có sơ đồ thật của Ban quản lý, thay bằng `<img>` (xem ghi chú trong file) và chỉnh lại toạ độ các số trong bảng `pois` (`map_x`, `map_y`, tính theo %).
- Ảnh cổng chính (`apps/web/public/img/poi-1.jpg`) cắt từ hình mẫu của bạn, chỉ để chạy thử. Hãy thay bằng ảnh có bản quyền khi tải ảnh qua admin.
- Quét QR trên mobile mới có ô nhập số in dưới mã; cần thêm `expo-camera` để quét thật.

## CI/CD (`.github/workflows`)

- `ci.yml`: mỗi Pull Request chạy typecheck và build.
- `deploy-web.yml`: merge vào `main` thì build và đưa web lên GitHub Pages.
- `deploy-admin.yml`: build admin và lưu bản build; thêm bước deploy theo nơi bạn chọn.
- `build-mobile.yml`: gắn tag `mobile-v*` thì build bằng EAS (cần `EXPO_TOKEN`).

Đặt `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` trong **GitHub → Settings → Secrets and variables → Actions**.
