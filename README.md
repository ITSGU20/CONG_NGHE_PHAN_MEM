# Dinh Độc Lập Guide – Frontend

Monorepo FE cho PRD "Ứng dụng Thuyết minh Đa ngôn ngữ Dinh Độc Lập" (v1.7).

| Thư mục                  | Công nghệ           | Use case                                                                                   |
| ------------------------ | ------------------- | ------------------------------------------------------------------------------------------ |
| `apps/web`               | React.js (Vite)     | UC1, UC2, UC3, UC5 – web du khách (`/poi/:id` là đích của mã QR)                           |
| `apps/mobile`            | React Native (Expo) | UC1, UC2, UC3 – giao diện du khách, xuất ra web tại `/mobile/`; không quét mã QR trong app |
| `apps/admin`             | React.js (Vite)     | UC6, UC7, UC8 – trang quản trị, chỉ desktop                                                |
| `packages/shared`        | TypeScript          | Kiểu dữ liệu, API (Supabase hoặc giả), i18n, trình phát, sự kiện, danh sách tầng           |
| `supabase/schema.sql`    | SQL                 | Bảng, phân quyền (RLS), hàm, kho ảnh, dữ liệu mẫu                                          |
| `scripts/make-pages.mjs` | Node.js             | Gộp 3 bản build thành một site GitHub Pages                                                |

## Chạy thử (không cần Supabase)

```bash
npm install
npm run dev:web      # http://localhost:5173
npm run dev:admin    # http://localhost:5174  (admin/admin123, editor/editor123, viewer/viewer123)
npm run dev:mobile   # chạy từ thư mục gốc; quét mã QR bằng app Expo Go
npm run typecheck
npm run build

npm run build:web -w @ddl/mobile   # xuất app mobile thành web (apps/mobile/dist)
npm run preview -w @ddl/web        # xem bản đã build: http://localhost:4173/CONG_NGHE_PHAN_MEM/
```

Lưu ý: khi chạy `npm run dev:*` địa chỉ nằm ở gốc `/`. Bản build (production) và GitHub Pages nằm dưới `/CONG_NGHE_PHAN_MEM/`, nên khi xem bằng `preview` phải gõ đủ tên thư mục này, nếu không trang sẽ trắng.

## Đối chiếu PRD v1.7 (cập nhật gần nhất)

- **Bản đồ theo tầng (UC2, UC8):** 6 tầng (hầm, trệt, 1, 2, 3, sân thượng), mỗi tầng một ảnh mặt bằng nhìn từ trên xuống. Du khách chọn tầng thì bản đồ và danh sách điểm đổi theo tầng đó; biên tập viên chọn tầng khi đặt vị trí điểm. Ảnh nằm ở `packages/shared/assets/floors/`, tên tầng ở `packages/shared/src/floors.ts`, mỗi điểm có cột `pois.floor_no`.
- **Mã QR (UC5):** du khách quét bằng camera mặc định của điện thoại và mở trang điểm trên web (`/poi/:id`). Ứng dụng mobile không còn màn hình quét QR.
- **Dashboard (UC7):** thêm bảng "Lượt truy cập theo ngày" (ngày, số lượt truy cập, số người dùng, tổng). `get_stats` trả thêm `visitsByDay`: đếm phiên theo ngày (GMT+7) và số thiết bị khác nhau; bảng chỉ lọc theo khoảng ngày, không lọc theo ngôn ngữ.
- **Mô hình dữ liệu (mục 8.3):** nội dung và ảnh của điểm gộp trong bảng `poi_versions` (hai bản nháp và đang xuất bản); không có bảng riêng cho ảnh bản đồ.

**Phải chạy lại `supabase/schema.sql`** trên project Supabase hiện có (an toàn khi chạy lại): file thêm cột `pois.floor_no`, cột `poi_versions.meta`, các hàm `save_draft`, `create_poi`, `discard_draft`, và đổi `get_stats` (có tham số lọc, trả thêm `visitsByDay`).

### Đã bổ sung trước đó (PRD v1.6)

Bộ lọc dashboard (7/30/90 ngày, tùy chọn, ngôn ngữ) cùng xử lý mất kết nối và "Chưa có dữ liệu" (UC7); quên mật khẩu, khóa tạm sau 5 lần sai, hết phiên (UC6); thêm điểm, sửa các trường chung (số thứ tự, tên nội bộ, loại, lối xe lăn, vị trí bằng cách chạm bản đồ), thay ảnh, kéo thả sắp xếp ảnh, chú thích ảnh theo ngôn ngữ, báo khi hai người cùng sửa, hủy điểm mới, kiểm tra ảnh (≥800px, nội dung thật, tự thu nhỏ/nén), nhật ký có ngôn ngữ (UC8); ghi `poi_open` khi vào bằng QR, đổi ngôn ngữ giữa chừng thì dừng đọc, thư viện ảnh, báo lỗi tải + thử lại, báo thiếu giọng đọc và chạm thanh tiến độ trên mobile (UC1/UC3).

Để liên kết "Quên mật khẩu" của admin hoạt động, thêm `https://itsgu20.github.io/CONG_NGHE_PHAN_MEM/admin/reset-password` (và `http://localhost:5174/reset-password` khi chạy thử) vào *Authentication → URL Configuration → Redirect URLs* của Supabase.

Chưa làm (ngoài MVP hoặc cần thêm gói): tạo mã QR ngay trong admin (hiện tạo bằng công cụ bên ngoài, xem mục "Mã QR"), tải ảnh mặt bằng từng tầng qua trang quản trị (ảnh tầng đang nằm trong mã nguồn), mở thẳng điểm khi quét mã trên bản mobile web (`/mobile/?poi=<id>`), giao diện sáng/cỡ chữ lớn (UI-05, mức S), khôi phục phiên bản cũ và ngoại tuyến (v1.1).

## Mã QR

Mã QR chỉ là một đường dẫn viết thành hình ảnh, trỏ tới web du khách:

```
https://itsgu20.github.io/CONG_NGHE_PHAN_MEM/poi/<mã điểm>
```

Cách lấy: mở một điểm trên web đã deploy rồi chép nguyên đường dẫn trên thanh địa chỉ, hoặc lấy cột `id` của bảng `pois` trong Supabase (*Table Editor*). Dán vào một trang tạo QR bất kỳ, in và đặt tại điểm. Không dùng địa chỉ `localhost`, và không đổi địa chỉ web sau khi đã in mã (BR-08).

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
- Hạn chế hiện tại: hàm `track_event` cho phép ai cũng gửi sự kiện nên số liệu (kể cả bảng lượt truy cập) có thể bị gửi giả. Việc đếm số lần đăng nhập sai chỉ thực hiện theo trình duyệt, chặn thật sự nhờ giới hạn tốc độ của Supabase Auth. Nếu cần chặt hơn thì thêm giới hạn tần suất ở máy chủ sau.

## Còn là dữ liệu mẫu

- Ảnh mặt bằng 6 tầng (`packages/shared/assets/floors/floor-*.png`) là hình minh hoạ, và việc điểm nào thuộc tầng nào (cột `pois.floor_no`) là đề xuất, cần Ban quản lý xác nhận. Khi có sơ đồ thật, thay các file ảnh cùng tên và chỉnh lại toạ độ `map_x`, `map_y` (tính theo %) của từng điểm.
- 8 điểm mẫu chưa có ảnh (chỉ hiện số thay cho ảnh bìa). Ảnh và nội dung chính thức do Ban quản lý cung cấp; quy tắc "ít nhất 1 ảnh để xuất bản" vẫn được kiểm tra khi biên tập viên xuất bản trong admin.
- Ảnh cổng chính (`apps/web/public/img/poi-1.jpg`) cắt từ hình mẫu của bạn, chỉ để chạy thử. Hãy thay bằng ảnh có bản quyền khi tải ảnh qua admin.

## Đưa lên GitHub Pages (`.github/workflows`)

- `ci.yml`: mỗi Pull Request và mỗi lần đẩy lên `main` chạy typecheck và build.
- `deploy-pages.yml`: đẩy lên `main` thì build web + admin + mobile (bản web) rồi đưa lên **một** site GitHub Pages:

  | Địa chỉ | Nội dung |
  | --- | --- |
  | `https://itsgu20.github.io/CONG_NGHE_PHAN_MEM/` | web du khách |
  | `https://itsgu20.github.io/CONG_NGHE_PHAN_MEM/admin/` | trang quản trị |
  | `https://itsgu20.github.io/CONG_NGHE_PHAN_MEM/mobile/` | app mobile (bản web, xuất bằng Expo) |

- `build-mobile.yml`: gắn tag `mobile-v*` thì build file APK bằng EAS (cần `EXPO_TOKEN`). Chỉ dùng khi cần file cài đặt cho Android.

Thiết lập một lần trên GitHub:

1. Repo phải **Public** (tài khoản miễn phí).
2. **Settings → Pages → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions**: tạo `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` (giá trị lấy từ file `.env.local`). Thiếu hai secret này thì site vẫn deploy nhưng chạy bằng dữ liệu giả.

Địa chỉ gốc `/CONG_NGHE_PHAN_MEM/` phải khớp tên repo và nằm ở 4 chỗ: `base` trong `apps/web/vite.config.ts` và `apps/admin/vite.config.ts` (ghi sẵn `mode === 'production'`), `experiments.baseUrl` trong `apps/mobile/app.json`, và hằng `BASE` trong `scripts/make-pages.mjs`. Đổi tên repo hay dùng tên miền riêng thì sửa cả 4 chỗ và in lại mã QR.
