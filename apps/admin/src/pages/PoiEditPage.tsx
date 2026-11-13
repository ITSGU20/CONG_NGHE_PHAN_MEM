import {
  CAPTION_MAX, ConflictError, DESC_MAX, discardDraft, FLOORS, floorName, floorOf, getAdminPois, LANGUAGES, MAX_IMAGES_PER_POI, metaOf, missingRequired,
  NAME_MAX, publishDraft, resolveContent, saveDraft, TTS_LOCALE, validateDraft,
  type LangCode, type Poi, type PoiLangContent, type PoiMeta, type PoiType, type PoiVersion,
} from '@ddl/shared';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { FLOOR_IMG } from '../floorMaps';
import { uploadImage } from '../media';
import { qrSvg } from '../qr';
import { confirmLeave, setUnsaved } from '../unsaved';

const empty: PoiLangContent = { name: '', description: '', narration: '' };
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number) => Math.min(100, Math.max(0, n));
const isUrl = (s: string) => /^(https?:|data:|\/)/.test(s);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
/** Địa chỉ gốc của web du khách; đặt VITE_WEB_URL khi triển khai để mã QR trỏ đúng nơi */
const WEB_URL = ((import.meta.env.VITE_WEB_URL as string | undefined) ?? 'http://localhost:5173').replace(/\/+$/, '');

/** Chuyển chú thích của một ảnh sang URL mới (thay ảnh) hoặc xóa (neu = null) ở mọi ngôn ngữ */
function moveCaptions(content: PoiVersion['content'], old: string, neu: string | null): PoiVersion['content'] {
  const out = clone(content);
  (Object.keys(out) as LangCode[]).forEach((l) => {
    const c = out[l];
    if (c?.captions && old in c.captions) {
      if (neu) c.captions[neu] = c.captions[old];
      delete c.captions[old];
    }
  });
  return out;
}

/** UC8 – Sửa một điểm: sửa trên bản nháp, xem trước, lưu nháp, xuất bản hoặc hủy (BR-11) */
export default function PoiEditPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [all, setAll] = useState<Poi[]>([]);
  const [poi, setPoi] = useState<Poi | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<PoiVersion>({ images: [], content: {} });
  const [lang, setLang] = useState<LangCode>('vi');
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null); // E4
  const [kept, setKept] = useState<PoiVersion | null>(null); // phần đang nhập được giữ lại khi tải bản mới
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const load = async () => {
    const list = await getAdminPois();
    const p = list.find((x) => x.id === id) ?? null;
    setAll(list);
    setPoi(p);
    if (p) setForm(clone({ ...(p.draft ?? p.published ?? { images: [], content: {} }), meta: metaOf(p) }));
    setDirty(false);
    setLoaded(true);
  };
  useEffect(() => {
    load().catch((e: Error) => { setMsg('Lỗi: ' + e.message); setLoaded(true); });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // UI-07: hỏi xác nhận khi rời trang có thay đổi chưa lưu (đóng tab và bấm liên kết trong trang)
  useEffect(() => {
    setUnsaved(dirty);
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);
  useEffect(() => () => setUnsaved(false), []);

  if (!loaded) return <p className="pad">Đang tải…</p>;
  if (!poi) return <div className="pad"><p>Không tìm thấy điểm này.</p>{msg && <p className="notice">{msg}</p>}<Link to="/pois">← Danh sách</Link></div>;

  const meta: PoiMeta = form.meta ?? metaOf(poi);
  const full: PoiVersion = { ...form, meta };
  const c = form.content[lang] ?? empty;
  const isNew = !poi.published;
  const errors = validateDraft(full, all.filter((p) => p.id !== poi.id).map((p) => p.number));
  const missing = missingRequired(full);
  const state = dirty
    ? 'Có thay đổi chưa lưu'
    : poi.draft
      ? poi.published ? 'Có thay đổi chưa xuất bản' : 'Bản nháp'
      : poi.published ? 'Đang xuất bản' : 'Bản nháp';

  const touch = (f: (v: PoiVersion) => PoiVersion) => {
    setForm(f);
    setDirty(true);
  };
  const setMeta = (patch: Partial<PoiMeta>) => touch((v) => ({ ...v, meta: { ...(v.meta ?? metaOf(poi)), ...patch } }));
  const setField = (k: 'name' | 'description' | 'narration', val: string) =>
    touch((v) => ({ ...v, content: { ...v.content, [lang]: { ...(v.content[lang] ?? empty), [k]: val } } }));
  const setCaption = (url: string, val: string) =>
    touch((v) => {
      const cur = v.content[lang] ?? empty;
      const captions = { ...(cur.captions ?? {}) };
      if (val) captions[url] = val;
      else delete captions[url];
      return { ...v, content: { ...v.content, [lang]: { ...cur, captions } } };
    });

  const run = async (fn: () => Promise<void>, ok: string) => {
    setMsg('');
    setBusy(true);
    try {
      await fn();
      setConflict(null);
      setMsg(ok);
      await load();
    } catch (e) {
      if (e instanceof ConflictError) setConflict(e.message);
      else setMsg('Lỗi: ' + (e as Error).message); // nội dung đang nhập vẫn giữ nguyên trên màn hình
    } finally {
      setBusy(false);
    }
  };
  const reloadLatest = async () => {
    setKept(clone(full)); // E4: giữ phần đang nhập để sao chép sang
    setConflict(null);
    setMsg('');
    await load();
  };
  const discard = async () => {
    const text = isNew
      ? 'Điểm mới chưa từng xuất bản sẽ bị xóa hoàn toàn. Tiếp tục?'
      : 'Hủy mọi thay đổi chưa xuất bản? Du khách vẫn thấy bản đang xuất bản.';
    if (!confirm(text)) return;
    setBusy(true);
    try {
      await discardDraft(user!.username, poi.id);
      if (isNew) {
        setDirty(false);
        setUnsaved(false);
        nav('/pois');
        return;
      }
      setMsg('Đã hủy thay đổi');
      await load();
    } catch (e) {
      setMsg('Lỗi: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /* ---------- ảnh (UC8, A4) ---------- */
  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setMsg('');
    setUploading(true);
    const urls: string[] = [];
    try {
      for (const f of Array.from(files)) {
        if (form.images.length + urls.length >= MAX_IMAGES_PER_POI) { setMsg(`Tối đa ${MAX_IMAGES_PER_POI} ảnh`); break; }
        urls.push(await uploadImage(f));
      }
    } catch (e) {
      setMsg('Lỗi tải ảnh: ' + (e as Error).message); // E3: ảnh đang có và nội dung đã nhập không bị mất, cho thử lại
    } finally {
      if (urls.length) touch((v) => ({ ...v, images: [...v.images, ...urls] }));
      setUploading(false);
    }
  };
  const replaceImage = async (i: number, file: File | undefined) => {
    if (!file) return;
    setMsg('');
    setUploading(true);
    try {
      const url = await uploadImage(file);
      touch((v) => {
        const old = v.images[i];
        const images = [...v.images];
        images[i] = url;
        return { ...v, images, content: moveCaptions(v.content, old, url) };
      });
    } catch (e) {
      setMsg('Lỗi tải ảnh: ' + (e as Error).message);
    } finally {
      setUploading(false);
    }
  };
  const moveImage = (from: number, to: number) =>
    touch((v) => {
      const images = [...v.images];
      const [x] = images.splice(from, 1);
      images.splice(to, 0, x);
      return { ...v, images };
    });
  const removeImage = (i: number) =>
    touch((v) => ({ ...v, images: v.images.filter((_, k) => k !== i), content: moveCaptions(v.content, v.images[i], null) }));

  const onMapClick = (e: MouseEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    setMeta({ mapX: clamp(round1(((e.clientX - b.left) / b.width) * 100)), mapY: clamp(round1(((e.clientY - b.top) / b.height) * 100)) });
  };

  const canSave = dirty && errors.length === 0 && !busy;
  const canPublish = (dirty || !!poi.draft) && missing.length === 0 && errors.length === 0 && !busy;

  return (
    <div className="pad">
      <Link to="/pois" onClick={(e) => { if (!confirmLeave()) e.preventDefault(); }}>← Danh sách</Link>
      <h1>Điểm {meta.number}: {meta.internalName} <span className={`tag ${dirty || poi.draft ? 'changed' : 'published'}`}>{state}</span></h1>

      {conflict && (
        <div className="banner" role="alert">
          <b>Không lưu được: có người khác đã sửa điểm này.</b>
          <span>{conflict}</span>
          <div><button className="btn" onClick={reloadLatest}>Tải bản mới nhất (giữ phần tôi đang nhập để sao chép)</button></div>
        </div>
      )}
      {kept && (
        <details className="banner">
          <summary>Nội dung bạn đã nhập trước khi tải lại (để sao chép sang) <button className="linkbtn" onClick={(e) => { e.preventDefault(); setKept(null); }}>Đóng</button></summary>
          {(Object.entries(kept.content) as [LangCode, PoiLangContent][]).map(([l, k]) => (
            <div key={l}>
              <b>{LANGUAGES.find((x) => x.code === l)?.label}</b>
              <textarea readOnly rows={5} value={`${k.name}\n\n${k.description}\n\n${k.narration}`} />
            </div>
          ))}
        </details>
      )}

      <h3 className="sectionhead">Thông tin chung (dùng cho mọi ngôn ngữ)</h3>
      <div className="grid2">
        <label>Số thứ tự (trùng với số trên bản đồ)
          <input type="number" min={1} step={1} value={Number.isNaN(meta.number) ? '' : meta.number} onChange={(e) => setMeta({ number: e.target.value === '' ? NaN : Number(e.target.value) })} />
        </label>
        <label>Tên nội bộ (du khách không thấy)
          <input value={meta.internalName} onChange={(e) => setMeta({ internalName: e.target.value })} />
        </label>
        <label>Loại
          <select value={meta.type} onChange={(e) => setMeta({ type: e.target.value as PoiType })}>
            <option value="outdoor">Ngoài trời</option>
            <option value="indoor">Trong nhà</option>
            <option value="mixed">Trong nhà/ngoài trời</option>
          </select>
        </label>
        <label className="checkrow">
          <input type="checkbox" checked={meta.wheelchair} onChange={(e) => setMeta({ wheelchair: e.target.checked })} />
          Có lối đi xe lăn
        </label>
      </div>

      <h3 className="sectionhead">Vị trí trên bản đồ</h3>
      <label>Tầng
      <select value={meta.floor ?? 0} onChange={(e) => setMeta({ floor: Number(e.target.value) })}>
       {FLOORS.map((f) => <option key={f.id} value={f.id}>{floorName(f.id, 'vi')}</option>)}
      </select>
      </label>
      <p className="muted">Chạm vào bản đồ để đặt số của điểm (vị trí lưu theo tỷ lệ % trên ảnh của tầng đang chọn).</p>
      <div className="mapbox" onClick={onMapClick} role="img" aria-label="Bản đồ: chạm để đặt vị trí điểm">
      <img className="mapart" src={FLOOR_IMG[meta.floor ?? 0]} alt="" draggable={false} />
       {all.filter((p) => p.id !== poi.id && floorOf(p) === (meta.floor ?? 0)).map((p) => (
      <span key={p.id} className="dot" style={{ left: `${p.mapX}%`, top: `${p.mapY}%` }}>{p.number}</span>
      ))}
      <span className="dot me" style={{ left: `${meta.mapX}%`, top: `${meta.mapY}%` }}>{Number.isNaN(meta.number) ? '?' : meta.number}</span>
      </div>
      <div className="grid2">
        <label>Vị trí ngang X (%)<input type="number" min={0} max={100} step={0.1} value={meta.mapX} onChange={(e) => setMeta({ mapX: Number(e.target.value) })} /></label>
        <label>Vị trí dọc Y (%)<input type="number" min={0} max={100} step={0.1} value={meta.mapY} onChange={(e) => setMeta({ mapY: Number(e.target.value) })} /></label>
      </div>

      <h3 className="sectionhead">Ảnh ({form.images.length}/{MAX_IMAGES_PER_POI}) – ảnh đầu tiên là ảnh bìa</h3>
      <p className="muted">Kéo thả để đổi thứ tự. JPG, PNG hoặc WebP, tối đa 5 MB, cạnh dài tối thiểu 800 px; ảnh lớn được tự thu nhỏ. Chú thích dưới ảnh nhập riêng theo ngôn ngữ đang chọn bên dưới (tuỳ chọn).</p>
      <div className="images">
        {form.images.map((im, i) => (
          <div key={im.slice(0, 40) + i} className="thumbwrap">
            <div
              className={'thumb' + (dragOver === i ? ' over' : '')}
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => { if (dragFrom !== null && dragFrom !== i) moveImage(dragFrom, i); setDragFrom(null); setDragOver(null); }}
              style={isUrl(im) ? { backgroundImage: `url("${im}")` } : undefined}
            >
              <span>{i === 0 ? 'Ảnh bìa' : `Ảnh ${i + 1}`}</span>
              <div>
                <button disabled={i === 0} onClick={() => moveImage(i, i - 1)} aria-label="Dời lên trước">←</button>
                <button disabled={i === form.images.length - 1} onClick={() => moveImage(i, i + 1)} aria-label="Dời ra sau">→</button>
                <label className="linkbtn" style={{ display: 'inline', margin: 0, fontSize: '.75rem', color: '#fff' }}>
                  Thay
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={uploading} onChange={(e) => { void replaceImage(i, e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                <button onClick={() => removeImage(i)}>Xóa</button>
              </div>
            </div>
            <input
              maxLength={CAPTION_MAX}
              placeholder={`Chú thích (${lang}), tối đa ${CAPTION_MAX} ký tự`}
              value={c.captions?.[im] ?? ''}
              onChange={(e) => setCaption(im, e.target.value)}
            />
          </div>
        ))}
        <label className="btn filebtn">
          {uploading ? 'Đang tải lên…' : '+ Thêm ảnh'}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={uploading || form.images.length >= MAX_IMAGES_PER_POI} onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} />
        </label>
      </div>

      <h3 className="sectionhead">Mã QR</h3>
      <button className="btn" onClick={() => setQrOpen(!qrOpen)}>{qrOpen ? 'Ẩn mã QR' : 'Tạo mã QR'}</button>
      {qrOpen && <QrPanel poi={poi} number={meta.number} name={meta.internalName} />}

      <h3 className="sectionhead">Nội dung theo ngôn ngữ</h3>
      <div className="tabs">
        {LANGUAGES.map((l) => {
          const k = form.content[l.code];
          const done = !!k?.name.trim() && !!k.description.trim() && !!k.narration.trim();
          return <button key={l.code} className={l.code === lang ? 'on' : ''} onClick={() => setLang(l.code)}>{l.label}{done ? ' ✓' : ''}</button>;
        })}
      </div>
      {lang !== 'vi' && lang !== 'en' && <p className="muted">Để trống thì du khách chọn ngôn ngữ này sẽ xem bản tiếng Anh (có thông báo).</p>}

      <label>Tên hiển thị ({c.name.length}/{NAME_MAX})
        <input maxLength={NAME_MAX} value={c.name} onChange={(e) => setField('name', e.target.value)} />
      </label>
      <label>Mô tả ({c.description.length}/{DESC_MAX})
        <textarea rows={2} maxLength={DESC_MAX} value={c.description} onChange={(e) => setField('description', e.target.value)} />
      </label>
      <label>Nội dung thuyết minh (các đoạn cách nhau bằng dòng trống)
        <textarea rows={8} value={c.narration} onChange={(e) => setField('narration', e.target.value)} />
      </label>
      <p className="muted">Âm thanh là giọng đọc tự động nội dung thuyết minh ở trên, không cần tải file âm thanh.</p>

      {errors.length > 0 && <ul className="errlist" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      {missing.length > 0 && <p className="notice">Chưa đủ để xuất bản: {missing.join(', ')}</p>}
      {msg && <p className="notice">{msg}</p>}

      <div className="toolbar">
        <button className="btn" onClick={() => setPreview(!preview)}>{preview ? 'Đóng xem trước' : 'Xem trước'}</button>
        <button className="btn" disabled={!canSave} onClick={() => run(() => saveDraft(user!.username, poi, full), 'Đã lưu bản nháp')}>Lưu nháp</button>
        <button
          className="btn primary"
          disabled={!canPublish}
          onClick={() => run(async () => { if (dirty) await saveDraft(user!.username, poi, full); await publishDraft(user!.username, poi.id); }, 'Đã xuất bản')}
        >
          Xuất bản
        </button>
        <button className="btn" disabled={busy || (!dirty && !poi.draft && !isNew)} onClick={discard}>Hủy thay đổi</button>
      </div>

      {preview && <Preview form={full} lang={lang} />}
    </div>
  );
}

/** Mã QR chỉ chứa đường dẫn có mã điểm (BR-08, UC8 A3); đổi số thứ tự không làm mã đã in mất hiệu lực vì dùng mã điểm */
function QrPanel({ poi, number, name }: { poi: Poi; number: number; name: string }) {
  const [base, setBase] = useState(WEB_URL);
  const url = `${base.trim().replace(/\/+$/, '')}/poi/${poi.id}`;
  const svg = useMemo(() => {
    try {
      return qrSvg(url, 256);
    } catch {
      return '';
    }
  }, [url]);

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    a.download = `qr-diem-${number}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const print = () => {
    const w = window.open('', '_blank', 'width=480,height=620');
    if (!w) return;
    w.document.write(`<title>QR điểm ${number}</title><body style="font-family:sans-serif;text-align:center;padding:24px">${svg}<h2 style="margin:8px 0 0">${number}</h2><p style="margin:4px 0">${esc(name)}</p></body>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="qrbox">
      {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="err">Không tạo được mã QR (đường dẫn quá dài).</p>}
      <div className="info">
        <label>Địa chỉ web du khách
          <input value={base} onChange={(e) => setBase(e.target.value)} />
        </label>
        <span>Nội dung mã: <code>{url}</code></span>
        <span className="muted">Số in dưới mã để du khách nhập tay nếu không quét được: <b>{Number.isNaN(number) ? '?' : number}</b></span>
        {!poi.published && <span className="notice">Điểm chưa xuất bản: quét mã sẽ báo chưa có nội dung cho đến khi xuất bản.</span>}
        <div className="actions no-print">
          <button className="btn" onClick={download} disabled={!svg}>Tải SVG</button>
          <button className="btn" onClick={print} disabled={!svg}>In</button>
        </div>
      </div>
    </div>
  );
}

/** Xem trước đúng như du khách thấy (BR-07 dùng tiếng Anh nếu thiếu bản dịch); "Phát thử" không gửi sự kiện vào dashboard (BR-12) */
function Preview({ form, lang }: { form: PoiVersion; lang: LangCode }) {
  const r = resolveContent(form, lang);
  const paras = (r.content?.narration ?? '').split(/\n\s*\n/).filter((p) => p.trim());
  const [speaking, setSpeaking] = useState(false);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  const cover = form.images[0];
  const m = form.meta;
  const typeLabel = m ? { outdoor: 'Ngoài trời', indoor: 'Trong nhà', mixed: 'Trong nhà/ngoài trời' }[m.type] : '';

  useEffect(() => () => synth?.cancel(), [synth, lang]);

  const toggle = () => {
    if (!synth) return;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const locale = TTS_LOCALE[r.textLang ?? lang];
    paras.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = locale;
      if (i === paras.length - 1) u.onend = () => setSpeaking(false);
      synth.speak(u);
    });
    setSpeaking(paras.length > 0);
  };

  return (
    <section className="previewbox">
      <h3>Xem trước ({lang}) – không ghi vào thống kê (BR-12)</h3>
      {r.usedFallback && <p className="notice">Chưa có bản dịch ở ngôn ngữ này: du khách sẽ xem bản tiếng Anh.</p>}
      {cover && isUrl(cover) && <img src={cover} alt={r.content?.captions?.[cover] ?? r.content?.name ?? ''} />}
      <h2>{r.content?.name || '(chưa có tên)'}</h2>
      <div className="chips">
        {typeLabel && <span className="chip">{typeLabel}</span>}
        {m?.wheelchair && <span className="chip">Có lối đi xe lăn</span>}
        {m && <span className="chip">Điểm {m.number}</span>}
      </div>
      <p>{r.content?.description}</p>
      <button className="btn" onClick={toggle} disabled={!synth || paras.length === 0}>{speaking ? 'Dừng' : 'Phát thử'}</button>
      {paras.map((p, i) => <p key={i}>{p}</p>)}
    </section>
  );
}
