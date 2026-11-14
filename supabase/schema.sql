-- =====================================================================
-- Dinh Độc Lập Guide – cơ sở dữ liệu Supabase
-- Cách dùng: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file này → Run.
-- File an toàn khi chạy lại (dùng IF NOT EXISTS / OR REPLACE / ON CONFLICT).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. BẢNG
-- ---------------------------------------------------------------------

-- Điểm tham quan (phần dùng chung cho mọi ngôn ngữ)
create table if not exists public.pois (
  id            uuid primary key default gen_random_uuid(),
  number        int  not null unique,                      -- số trên bản đồ
  internal_name text not null,
  type          text not null check (type in ('outdoor','indoor','mixed')),
  map_x         numeric not null check (map_x between 0 and 100),  -- vị trí theo % trên ảnh bản đồ
  map_y         numeric not null check (map_y between 0 and 100),
  floor_no      int  not null default 0,
  wheelchair    boolean not null default false,
  hidden        boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Nội dung của điểm: mỗi điểm có tối đa 2 dòng: 'published' (du khách thấy) và 'draft' (bản nháp) – BR-11
-- content có dạng: {"vi": {"name","description","narration"}, "en": {...}, ...}
create table if not exists public.poi_versions (
  poi_id     uuid not null references public.pois(id) on delete cascade,
  kind       text not null check (kind in ('published','draft')),
  images     text[] not null default '{}',                 -- URL ảnh, ảnh đầu là ảnh bìa
  content    jsonb  not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (poi_id, kind)
);

-- Các trường chung của điểm cũng nằm trên bản nháp (BR-11, mục 8.4): số thứ tự, tên nội bộ, loại, lối xe lăn, vị trí.
-- meta có dạng {"number","internalName","type","wheelchair","mapX","mapY"}; khi xuất bản được chép sang bảng pois.
alter table public.pois add column if not exists floor_no int not null default 0;
alter table public.poi_versions add column if not exists meta jsonb not null default '{}'::jsonb;

-- Vai trò của tài khoản quản trị (BR-09). Tài khoản đăng nhập nằm ở auth.users do Supabase quản lý.
create table if not exists public.profiles (
  id       uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  role     text not null check (role in ('admin','editor','viewer'))
);

-- Nhật ký chỉnh sửa (BR-12): chỉ thêm, không có chính sách sửa/xóa nên không ai sửa được
create table if not exists public.audit_log (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  user_id  uuid references auth.users(id),
  username text not null,
  poi_id   uuid references public.pois(id) on delete set null,
  lang     text,
  action   text not null
);

-- Phiên truy cập (cho "Tổng người dùng", "Đang truy cập", "Đang sử dụng")
create table if not exists public.sessions (
  id         text primary key,
  device_id  text not null,
  lang       text,
  started_at timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  ended_at   timestamptz,
  playing    boolean not null default false
);

-- Lượt nghe hợp lệ (đủ 10 giây, BR-03)
create table if not exists public.listens (
  id             bigint generated always as identity primary key,
  session_id     text,
  device_id      text not null,
  poi_id         uuid references public.pois(id) on delete set null,
  audio_lang     text not null,
  played_seconds int  not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists listens_created_idx on public.listens (created_at);
create index if not exists sessions_seen_idx   on public.sessions (last_seen);

-- ---------------------------------------------------------------------
-- 2. PHÂN QUYỀN (Row Level Security)
-- Nguyên tắc: du khách (anon) KHÔNG đọc/ghi bảng trực tiếp, chỉ gọi các hàm ở mục 3.
-- ---------------------------------------------------------------------
alter table public.pois          enable row level security;
alter table public.poi_versions  enable row level security;
alter table public.profiles      enable row level security;
alter table public.audit_log     enable row level security;
alter table public.sessions      enable row level security;   -- không có policy => chỉ hàm security definer truy cập
alter table public.listens       enable row level security;

-- Trả về vai trò của người đang đăng nhập (null nếu chưa đăng nhập hoặc chưa được cấp vai trò)
create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

drop policy if exists "profiles: xem của mình" on public.profiles;
create policy "profiles: xem của mình" on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists "pois: biên tập" on public.pois;
create policy "pois: biên tập" on public.pois for all to authenticated
  using (public.current_role_name() in ('admin','editor'))
  with check (public.current_role_name() in ('admin','editor'));

drop policy if exists "versions: biên tập" on public.poi_versions;
create policy "versions: biên tập" on public.poi_versions for all to authenticated
  using (public.current_role_name() in ('admin','editor'))
  with check (public.current_role_name() in ('admin','editor'));

drop policy if exists "audit: xem" on public.audit_log;
create policy "audit: xem" on public.audit_log for select to authenticated
  using (public.current_role_name() in ('admin','editor'));

drop policy if exists "audit: thêm" on public.audit_log;
create policy "audit: thêm" on public.audit_log for insert to authenticated
  with check (public.current_role_name() in ('admin','editor') and user_id = auth.uid());
-- cố ý KHÔNG tạo policy update/delete cho audit_log

-- ---------------------------------------------------------------------
-- 3. HÀM (RPC) cho ứng dụng gọi
-- ---------------------------------------------------------------------

-- Du khách: danh sách điểm đã xuất bản và không bị ẩn (BR-05)
create or replace function public.get_visitor_pois()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'number', p.number,
      'internalName', p.internal_name,
      'type', p.type,
      'mapX', p.map_x,
      'mapY', p.map_y,
      'floor', p.floor_no,
      'wheelchair', p.wheelchair,
      'hidden', false,
      'published', jsonb_build_object('images', to_jsonb(v.images), 'content', v.content)
    ) order by p.number), '[]'::jsonb)
  from public.pois p
  join public.poi_versions v on v.poi_id = p.id and v.kind = 'published'
  where not p.hidden
$$;
grant execute on function public.get_visitor_pois() to anon, authenticated;

-- Ghi sự kiện sử dụng (mục 10.2). Chỉ nhận các sự kiện hợp lệ, dữ liệu ẩn danh.
create or replace function public.track_event(p_name text, p_session text, p_device text, p_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_poi  uuid;
  v_lang text;
begin
  if p_session is null or p_device is null or length(p_session) > 80 or length(p_device) > 80 then return; end if;

  if p_name = 'session_start' then
    insert into sessions (id, device_id, lang) values (p_session, p_device, left(p_data->>'lang', 5))
    on conflict (id) do update set last_seen = now();

  elsif p_name = 'heartbeat' then
    update sessions set last_seen = now(), playing = coalesce((p_data->>'playing')::boolean, false)
    where id = p_session and ended_at is null;

  elsif p_name = 'language_select' then
    update sessions set lang = left(p_data->>'lang', 5), last_seen = now() where id = p_session;

  elsif p_name = 'audio_play' then
    update sessions set playing = true, last_seen = now() where id = p_session;

  elsif p_name in ('audio_pause', 'audio_stop') then
    update sessions set playing = false, last_seen = now() where id = p_session;

  elsif p_name = 'session_end' then
    update sessions set ended_at = now(), playing = false where id = p_session;

  elsif p_name = 'listen_valid' then
    v_lang := coalesce(p_data->>'audioLang', 'en');
    if v_lang not in ('vi','en','zh','ja','ko','fr','ru','de','es','th') then return; end if;
    v_poi := case when (p_data->>'poiId') ~ '^[0-9a-fA-F-]{36}$' then (p_data->>'poiId')::uuid else null end;
    insert into listens (session_id, device_id, poi_id, audio_lang, played_seconds)
    values (p_session, p_device, v_poi, v_lang, least(greatest(coalesce((p_data->>'played')::numeric, 0), 0), 3600)::int);
  end if;
  -- poi_open và các sự kiện thô khác chưa lưu ở MVP (mục 8.3 PRD)
end $$;
grant execute on function public.track_event(text, text, text, jsonb) to anon, authenticated;

-- Dashboard: chỉ admin và viewer gọi được (BR-09).
-- Bộ lọc (UC7 bước 6): khoảng ngày (mặc định 7 ngày gần nhất, múi giờ GMT+7) và ngôn ngữ giọng đọc.
-- Ba thẻ số liệu (tổng, đang truy cập, đang sử dụng) không phụ thuộc bộ lọc.
drop function if exists public.get_stats();
create or replace function public.get_stats(p_from date default null, p_to date default null, p_lang text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  r      text := public.current_role_name();
  res    jsonb;
  today  date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  d_to   date := least(coalesce(p_to, today), today);
  d_from date;
begin
  if r is null or r not in ('admin', 'viewer') then raise exception 'forbidden'; end if;
  d_from := coalesce(p_from, d_to - 6);
  if d_from > d_to then d_from := d_to; end if;
  if d_to - d_from > 365 then d_from := d_to - 365; end if;

  select jsonb_build_object(
    'from',       d_from,
    'to',         d_to,
    'totalUsers', (select count(distinct device_id) from sessions),
    'online',     (select count(*) from sessions where ended_at is null and last_seen > now() - interval '90 seconds'),
    'playing',    (select count(*) from sessions where ended_at is null and last_seen > now() - interval '90 seconds' and playing),
    'byLanguage', coalesce((
        select jsonb_object_agg(audio_lang, c)
        from (
          select l.audio_lang, count(*) as c
          from listens l
          where (l.created_at at time zone 'Asia/Ho_Chi_Minh')::date between d_from and d_to
            and (p_lang is null or l.audio_lang = p_lang)
          group by l.audio_lang
        ) x), '{}'::jsonb),
    'byDay',      coalesce((
        select jsonb_agg(jsonb_build_object('date', to_char(d, 'MM-DD'), 'count', n) order by d)
        from (
          select g::date as d,
                 (select count(*) from listens l
                   where (l.created_at at time zone 'Asia/Ho_Chi_Minh')::date = g::date
                     and (p_lang is null or l.audio_lang = p_lang)) as n
          from generate_series(d_from::timestamp, d_to::timestamp, interval '1 day') g
        ) y), '[]'::jsonb)
  ) into res;
  return res;
end $$;
grant execute on function public.get_stats(date, date, text) to authenticated;

-- Xuất bản: bản nháp trở thành bản đang hiển thị (BR-11), kiểm tra trường bắt buộc, ghi nhật ký (BR-12)
create or replace function public.publish_poi(p_poi uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r     text := public.current_role_name();
  d     public.poi_versions;
  uname text;
  l     text;
begin
  if r is null or r not in ('admin', 'editor') then raise exception 'forbidden'; end if;
  select * into d from public.poi_versions where poi_id = p_poi and kind = 'draft';
  if not found then raise exception 'Không có bản nháp để xuất bản'; end if;

  if coalesce(array_length(d.images, 1), 0) < 1 then raise exception 'Thiếu: ít nhất 1 ảnh'; end if;
  foreach l in array array['vi', 'en'] loop
    if coalesce(trim(d.content -> l ->> 'name'), '') = ''        then raise exception 'Thiếu: tên (%)', l; end if;
    if coalesce(trim(d.content -> l ->> 'description'), '') = '' then raise exception 'Thiếu: mô tả (%)', l; end if;
    if coalesce(trim(d.content -> l ->> 'narration'), '') = ''   then raise exception 'Thiếu: thuyết minh (%)', l; end if;
  end loop;

  -- các trường chung của bản nháp trở thành bản đang hiển thị (BR-11)
  if d.meta ? 'number' then
    update public.pois set
      number        = (d.meta ->> 'number')::int,
      internal_name = d.meta ->> 'internalName',
      type          = d.meta ->> 'type',
      wheelchair    = coalesce((d.meta ->> 'wheelchair')::boolean, false),
      map_x         = (d.meta ->> 'mapX')::numeric,
      map_y         = (d.meta ->> 'mapY')::numeric,
      floor_no = coalesce((d.meta ->> 'floor')::int, 0)
    where id = p_poi;
  end if;

  insert into public.poi_versions (poi_id, kind, images, content, updated_by)
  values (p_poi, 'published', d.images, d.content, auth.uid())
  on conflict (poi_id, kind) do update
    set images = excluded.images, content = excluded.content, updated_at = now(), updated_by = excluded.updated_by;
  delete from public.poi_versions where poi_id = p_poi and kind = 'draft';

  select username into uname from public.profiles where id = auth.uid();
  insert into public.audit_log (user_id, username, poi_id, action) values (auth.uid(), coalesce(uname, '?'), p_poi, 'Xuất bản');
end $$;
grant execute on function public.publish_poi(uuid) to authenticated;

-- Lưu bản nháp (UC8 bước 8): kiểm tra dữ liệu (E1), chống ghi đè khi hai người cùng sửa (E4),
-- ghi nhật ký có ngôn ngữ (BR-12). p_expected = dấu thời gian của bản mà người dùng đã mở (null nếu điểm chưa có bản nào).
create or replace function public.save_draft(p_poi uuid, p_images text[], p_content jsonb, p_meta jsonb, p_expected timestamptz default null)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  r        text := public.current_role_name();
  cur      public.poi_versions;
  pub      public.poi_versions;
  poi_row  public.pois;
  base_c   jsonb;
  base_i   text[];
  base_m   jsonb;
  token    timestamptz;
  who      uuid;
  uname    text;
  k        text;
  v        jsonb;
  cap      text;
  ts       timestamptz := clock_timestamp();
  n        int;
  mx       numeric;
  my       numeric;
begin
  if r is null or r not in ('admin', 'editor') then raise exception 'forbidden'; end if;

  select * into poi_row from public.pois where id = p_poi for update;   -- tuần tự hóa các lần lưu cùng một điểm
  if not found then raise exception 'Không tìm thấy điểm'; end if;
  select * into cur from public.poi_versions where poi_id = p_poi and kind = 'draft';
  select * into pub from public.poi_versions where poi_id = p_poi and kind = 'published';

  -- E4: người khác đã lưu hoặc xuất bản từ lúc bạn mở trang
  token := coalesce(cur.updated_at, pub.updated_at);
  if token is distinct from p_expected then
    who := coalesce(cur.updated_by, pub.updated_by);
    select username into uname from public.profiles where id = who;
    raise exception 'CONFLICT: Điểm này vừa được % lưu hoặc xuất bản lúc %. Hãy tải lại bản mới nhất; nội dung bạn đang nhập vẫn được giữ trên màn hình để sao chép.',
      coalesce(uname, 'người khác'), to_char(token at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM/YYYY');
  end if;

  -- E1: kiểm tra dữ liệu
  if p_meta is null or p_meta = '{}'::jsonb then raise exception 'Thiếu thông tin chung của điểm'; end if;
  n  := (p_meta ->> 'number')::int;
  mx := (p_meta ->> 'mapX')::numeric;
  my := (p_meta ->> 'mapY')::numeric;
  if n is null or n < 1 then raise exception 'Số thứ tự phải là số nguyên dương'; end if;
  if coalesce((p_meta ->> 'floor')::int, 0) not between -1 and 4 then raise exception 'Tầng không hợp lệ'; end if;
  if exists (select 1 from public.pois where number = n and id <> p_poi) then raise exception 'Số thứ tự % đã được dùng cho điểm khác', n; end if;
  if coalesce(trim(p_meta ->> 'internalName'), '') = '' then raise exception 'Tên nội bộ không được để trống'; end if;
  if (p_meta ->> 'type') not in ('outdoor', 'indoor', 'mixed') then raise exception 'Loại điểm không hợp lệ'; end if;
  if mx is null or my is null or mx < 0 or mx > 100 or my < 0 or my > 100 then raise exception 'Vị trí nằm ngoài ảnh bản đồ'; end if;
  if coalesce(array_length(p_images, 1), 0) > 10 then raise exception 'Tối đa 10 ảnh mỗi điểm'; end if;

  for k, v in select * from jsonb_each(coalesce(p_content, '{}'::jsonb)) loop
    if k not in ('vi', 'en', 'zh', 'ja', 'ko', 'fr', 'ru', 'de', 'es', 'th') then raise exception 'Ngôn ngữ không hợp lệ: %', k; end if;
    if length(coalesce(v ->> 'name', '')) > 80 then raise exception 'Tên hiển thị (%) vượt quá 80 ký tự', k; end if;
    if length(coalesce(v ->> 'description', '')) > 300 then raise exception 'Mô tả (%) vượt quá 300 ký tự', k; end if;
    if jsonb_typeof(v -> 'captions') = 'object' then
      for cap in select value #>> '{}' from jsonb_each(v -> 'captions') loop
        if length(coalesce(cap, '')) > 120 then raise exception 'Chú thích ảnh (%) vượt quá 120 ký tự', k; end if;
      end loop;
    end if;
  end loop;

  -- nhật ký: so với bản nháp hiện có, nếu chưa có thì so với bản đang xuất bản
  base_c := coalesce(cur.content, pub.content, '{}'::jsonb);
  base_i := coalesce(cur.images, pub.images, '{}');
  base_m := case when cur.poi_id is not null and cur.meta <> '{}'::jsonb then cur.meta
                 else jsonb_build_object('number', poi_row.number, 'internalName', poi_row.internal_name, 'type', poi_row.type,
                                         'wheelchair', poi_row.wheelchair, 'mapX', poi_row.map_x, 'mapY', poi_row.map_y, 'floor', poi_row.floor_no) end;
  select username into uname from public.profiles where id = auth.uid();
  uname := coalesce(uname, '?');

  insert into public.poi_versions (poi_id, kind, images, content, meta, updated_at, updated_by)
  values (p_poi, 'draft', coalesce(p_images, '{}'), coalesce(p_content, '{}'::jsonb), p_meta, ts, auth.uid())
  on conflict (poi_id, kind) do update
    set images = excluded.images, content = excluded.content, meta = excluded.meta, updated_at = excluded.updated_at, updated_by = excluded.updated_by;

  insert into public.audit_log (user_id, username, poi_id, action) values (auth.uid(), uname, p_poi, 'Lưu bản nháp');
  for k in select distinct key from (select jsonb_object_keys(base_c) as key union select jsonb_object_keys(coalesce(p_content, '{}'::jsonb))) u loop
    if (base_c -> k) is distinct from (coalesce(p_content, '{}'::jsonb) -> k) then
      insert into public.audit_log (user_id, username, poi_id, lang, action) values (auth.uid(), uname, p_poi, k, 'Sửa nội dung');
    end if;
  end loop;
  if base_i is distinct from coalesce(p_images, '{}') then
    insert into public.audit_log (user_id, username, poi_id, action) values (auth.uid(), uname, p_poi, 'Thay đổi ảnh');
  end if;
  if base_m is distinct from p_meta then
    insert into public.audit_log (user_id, username, poi_id, action) values (auth.uid(), uname, p_poi, 'Sửa thông tin chung');
  end if;
  return ts;
end $$;
grant execute on function public.save_draft(uuid, text[], jsonb, jsonb, timestamptz) to authenticated;

-- Thêm điểm (UC8 bước 4): tạo điểm mới với số thứ tự kế tiếp; chưa có bản xuất bản nên du khách chưa thấy (BR-05)
create or replace function public.create_poi()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  r     text := public.current_role_name();
  n     int;
  new_id uuid;
  uname text;
begin
  if r is null or r not in ('admin', 'editor') then raise exception 'forbidden'; end if;
  lock table public.pois in share row exclusive mode;
  select coalesce(max(number), 0) + 1 into n from public.pois;
  insert into public.pois (number, internal_name, type, map_x, map_y)
  values (n, 'Điểm mới ' || n, 'indoor', 50, 50) returning id into new_id;
  select username into uname from public.profiles where id = auth.uid();
  insert into public.audit_log (user_id, username, poi_id, action) values (auth.uid(), coalesce(uname, '?'), new_id, 'Thêm điểm');
  return new_id;
end $$;
grant execute on function public.create_poi() to authenticated;

-- Hủy thay đổi (UC8, A7): xóa bản nháp, giữ nguyên bản đang xuất bản; điểm mới chưa từng xuất bản thì xóa luôn điểm đó
create or replace function public.discard_draft(p_poi uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r     text := public.current_role_name();
  uname text;
  iname text;
begin
  if r is null or r not in ('admin', 'editor') then raise exception 'forbidden'; end if;
  select username into uname from public.profiles where id = auth.uid();
  select internal_name into iname from public.pois where id = p_poi;
  if not found then return; end if;
  delete from public.poi_versions where poi_id = p_poi and kind = 'draft';
  if not exists (select 1 from public.poi_versions where poi_id = p_poi and kind = 'published') then
    delete from public.pois where id = p_poi;   -- audit_log.poi_id tự về null (on delete set null)
    insert into public.audit_log (user_id, username, action) values (auth.uid(), coalesce(uname, '?'), 'Hủy điểm mới: ' || coalesce(iname, ''));
  else
    insert into public.audit_log (user_id, username, poi_id, action) values (auth.uid(), coalesce(uname, '?'), p_poi, 'Hủy thay đổi');
  end if;
end $$;
grant execute on function public.discard_draft(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. KHO ẢNH (Storage): bucket công khai để du khách xem, chỉ biên tập viên được tải lên
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('poi-media', 'poi-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "poi-media: ai cũng xem" on storage.objects;
create policy "poi-media: ai cũng xem" on storage.objects for select using (bucket_id = 'poi-media');

drop policy if exists "poi-media: biên tập tải lên" on storage.objects;
create policy "poi-media: biên tập tải lên" on storage.objects for insert to authenticated
  with check (bucket_id = 'poi-media' and public.current_role_name() in ('admin', 'editor'));

drop policy if exists "poi-media: biên tập sửa" on storage.objects;
create policy "poi-media: biên tập sửa" on storage.objects for update to authenticated
  using (bucket_id = 'poi-media' and public.current_role_name() in ('admin', 'editor'));

drop policy if exists "poi-media: biên tập xóa" on storage.objects;
create policy "poi-media: biên tập xóa" on storage.objects for delete to authenticated
  using (bucket_id = 'poi-media' and public.current_role_name() in ('admin', 'editor'));

-- ---------------------------------------------------------------------
-- 5. DỮ LIỆU MẪU: 27 điểm (25 điểm theo sơ đồ 6 tầng thực tế + 2 điểm sân ngoài trời)
-- ---------------------------------------------------------------------
with src(num, vi, en, typ, x, y, fl, wc) as (
  values
    (1,  'Phòng Nội các',                      'Cabinet room',                        'indoor',  63.5, 52.0,  1, true),
    (2,  'Phòng Đại yến',                      'State banqueting hall',               'indoor',  36.5, 52.0,  1, true),
    (3,  'Cầu thang trung tâm',                'Central staircase',                   'indoor',  50.0, 47.3,  1, false),
    (4,  'Phòng Khánh tiết',                   'Conference hall',                     'indoor',  50.0, 28.4,  1, true),
    (5,  'Phòng Hội đồng an ninh Quốc gia',    'National security council chamber',   'indoor',  25.0, 50.5,  2, false),
    (6,  'Phòng làm việc của Tổng thống',      'Presidential office',                 'indoor',  25.3, 57.7,  2, false),
    (7,  'Phòng khách của Tổng thống',         'Presidential reception rooms',        'indoor',  38.8, 50.5,  2, false),
    (8,  'Phòng khách của Phó Tổng thống',     'Vice-president''s reception salon',   'indoor',  65.0, 50.5,  2, false),
    (9,  'Phòng trình quốc thư',               'Ambassadors chamber',                 'indoor',  50.0, 29.5,  2, false),
    (10, 'Khu gia đình Tổng thống',            'Private appartments',                 'indoor',  50.0,  9.0,  2, false),
    (11, 'Thư viện',                           'Library',                             'indoor',  24.9, 57.7,  3, false),
    (12, 'Phòng khách phu nhân Tổng thống',    'First lady''s reception room',        'indoor',  37.8, 50.5,  3, false),
    (13, 'Phòng chiếu phim',                   'Cinema',                              'indoor',  50.8, 50.5,  3, false),
    (14, 'Phòng giải trí',                     'Game room',                           'indoor',  68.3, 50.5,  3, false),
    (15, 'Tứ phương vô sự lâu',                'Salon of the 4 cardinal directions',  'mixed',   50.0, 51.8,  4, false),
    (16, 'Trực thăng UH1',                     'Helicopter UH-1',                     'outdoor', 50.0, 19.4,  4, false),
    (17, 'Tham mưu tác chiến',                 'Command centre',                      'indoor',  77.5, 38.3, -1, false),
    (18, 'Thông tin liên lạc',                 'Communications',                      'indoor',  63.8, 44.6, -1, false),
    (19, 'Phòng ngủ Tổng thống',               'President''s bedroom',                'indoor',  50.4, 45.5, -1, false),
    (20, 'Phòng trực chiến của Tổng thống',    'President''s war room',               'indoor',  46.4, 45.5, -1, false),
    (21, 'Bếp',                                'Kitchen',                             'indoor',  24.5, 49.1,  0, true),
    (22, 'Xe Jeep',                            'Jeep',                                'indoor',  31.8, 52.7,  0, true),
    (23, 'Xe Mercedes',                        'Mercedes',                            'indoor',  64.5, 46.8,  0, true),
    (24, 'Phim tư liệu',                       'Documentary films',                   'indoor',  43.8, 35.0,  0, true),
    (25, 'Phòng tập bắn',                      'Shooting gallery',                    'indoor',  52.8, 27.3,  0, true),
    (26, 'Cổng chính và sân vườn',             'Main gate and garden',                'outdoor', 50.0, 93.0,  0, true),
    (27, 'Xe tăng trong sân trước',            'Tanks in the front yard',             'outdoor', 31.0, 82.0,  0, true)
), ins as (
  insert into public.pois (number, internal_name, type, map_x, map_y, floor_no, wheelchair)
  select num, en, typ, x, y, fl, wc from src
  on conflict (number) do update set
    internal_name = excluded.internal_name,
    type = excluded.type,
    map_x = excluded.map_x,
    map_y = excluded.map_y,
    floor_no = excluded.floor_no,
    wheelchair = excluded.wheelchair
  returning id, number
)
insert into public.poi_versions (poi_id, kind, images, content)
select ins.id, 'published', '{}',
  jsonb_build_object(
    'vi', jsonb_build_object(
      'name', src.vi,
      'description', 'Giới thiệu về ' || src.vi || ' tại Dinh Độc Lập.',
      'narration', 'Chào mừng quý khách đến với ' || src.vi || '. Đây là một trong những không gian lịch sử tiêu biểu nằm trong sơ đồ tham quan chính thức của Dinh Độc Lập.' || E'\n\n' ||
                   'Nội dung thuyết minh chi tiết giới thiệu về kiến trúc, công năng và các dấu mốc lịch sử gắn liền với ' || src.vi || '.' || E'\n\n' ||
                   'Quý khách có thể đối chiếu vị trí trên bản đồ từng tầng để tiếp tục hành trình tham quan.'),
    'en', jsonb_build_object(
      'name', src.en,
      'description', 'Introduction to the ' || src.en || ' at Independence Palace.',
      'narration', 'Welcome to the ' || src.en || '. This is one of the historical spaces featured on the official floor plan of the Independence Palace.' || E'\n\n' ||
                   'This narration introduces the architecture, function, and historical milestones associated with the ' || src.en || '.' || E'\n\n' ||
                   'Please refer to the interactive floor map to continue your tour.'))
from ins join src on src.num = ins.number
on conflict (poi_id, kind) do update set
  content = excluded.content,
  updated_at = now();

-- ---------------------------------------------------------------------
-- 6. TẠO TÀI KHOẢN QUẢN TRỊ ĐẦU TIÊN (làm thủ công, KHÔNG để mật khẩu trong file này)
--   B1. Dashboard → Authentication → Users → Add user: nhập email + mật khẩu (tick "Auto Confirm User").
--   B2. Chạy lệnh dưới đây (đổi email) để cấp vai trò. Vai trò: 'admin' | 'editor' | 'viewer'.
--
--   insert into public.profiles (id, username, role)
--   select id, email, 'admin' from auth.users where email = 'ban@example.com'
--   on conflict (id) do update set role = excluded.role;
-- ---------------------------------------------------------------------
