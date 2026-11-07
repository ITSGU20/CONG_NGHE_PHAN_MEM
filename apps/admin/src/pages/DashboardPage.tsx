import { DASHBOARD_POLL_MS, getStats, isBackendEnabled, LANGUAGES, vnDate, type LangCode, type Stats, type StatsFilter } from '@ddl/shared';
import { useEffect, useRef, useState } from 'react';

type Preset = '7' | '30' | '90' | 'custom';
const DAY_MS = 86_400_000;

/** UC7 – Dashboard: 3 thẻ số liệu làm mới mỗi 5 giây (NFR-04) + 2 biểu đồ có bộ lọc ngày và ngôn ngữ */
export default function DashboardPage() {
  const [s, setS] = useState<Stats | null>(null);
  const [preset, setPreset] = useState<Preset>('7');
  const [from, setFrom] = useState(vnDate(new Date(Date.now() - 6 * DAY_MS)));
  const [to, setTo] = useState(vnDate());
  const [lang, setLang] = useState<LangCode | ''>('');
  const [offline, setOffline] = useState(false); // E1: không lấy được số liệu mới
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const req = useRef(0);

  const today = vnDate();
  const rangeOk = from <= to && to <= today;
  const filter: StatsFilter = (() => {
    if (preset === 'custom') return { from, to, lang: lang || undefined };
    const days = Number(preset);
    return { from: vnDate(new Date(Date.now() - (days - 1) * DAY_MS)), to: today, lang: lang || undefined };
  })();
  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    if (!rangeOk) return;
    let alive = true;
    const load = () => {
      const mine = ++req.current;
      getStats(filter).then(
        (x) => {
          if (!alive || mine !== req.current) return;
          setS(x);
          setOffline(false);
          setUpdatedAt(new Date());
        },
        () => alive && mine === req.current && setOffline(true), // giữ số liệu cuối, tự thử lại ở chu kỳ kế tiếp
      );
    };
    load();
    const id = setInterval(load, DASHBOARD_POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [filterKey, rangeOk]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return <p className="pad">{offline ? 'Mất kết nối, đang thử lại…' : 'Đang tải…'}</p>;

  const maxLang = Math.max(1, ...Object.values(s.byLanguage));
  const maxDay = Math.max(1, ...s.byDay.map((d) => d.count));
  const hasData = s.byDay.some((d) => d.count > 0) || Object.values(s.byLanguage).some((n) => n > 0); // E2

  return (
    <div className="pad">
      <h1>Dashboard</h1>

      {offline && (
        <p className="notice">
          Mất kết nối, đang thử lại. Đang hiển thị số liệu lúc {updatedAt?.toLocaleTimeString('vi-VN')}.
        </p>
      )}

      <div className="cards">
        <Card label="Tổng người dùng" value={s.totalUsers} />
        <Card label="Đang truy cập" value={s.online} />
        <Card label="Đang sử dụng" value={s.playing} />
      </div>

      <div className="filters">
        <label>
          Khoảng thời gian
          <select value={preset} onChange={(e) => setPreset(e.target.value as Preset)}>
            <option value="7">7 ngày</option>
            <option value="30">30 ngày</option>
            <option value="90">90 ngày</option>
            <option value="custom">Tùy chọn</option>
          </select>
        </label>
        {preset === 'custom' && (
          <>
            <label>Từ ngày<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
            <label>Đến ngày<input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} /></label>
          </>
        )}
        <label>
          Ngôn ngữ
          <select value={lang} onChange={(e) => setLang(e.target.value as LangCode | '')}>
            <option value="">Tất cả</option>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </label>
      </div>
      {!rangeOk && <p className="err">Khoảng ngày không hợp lệ: ngày bắt đầu phải trước hoặc bằng ngày kết thúc và không ở tương lai.</p>}

      {hasData ? (
        <div className="charts">
          <section>
            <h3>Lượt nghe theo ngôn ngữ</h3>
            {LANGUAGES.map((l) => (
              <Bar key={l.code} label={l.label} value={s.byLanguage[l.code]} max={maxLang} />
            ))}
          </section>
          <section>
            <h3>Lượt nghe theo ngày ({s.byDay.length} ngày)</h3>
            <div className="scrolly">
              {s.byDay.map((d) => (
                <Bar key={d.date} label={d.date} value={d.count} max={maxDay} />
              ))}
            </div>
          </section>
        </div>
      ) : (
        <p className="empty">Chưa có dữ liệu trong khoảng đã chọn.</p>
      )}

      <small>
        {isBackendEnabled() ? 'Số liệu từ máy chủ' : 'Số liệu giả lập'}, ba thẻ trên tự làm mới mỗi {DASHBOARD_POLL_MS / 1000} giây
        {updatedAt && `; cập nhật lúc ${updatedAt.toLocaleTimeString('vi-VN')}`}.
      </small>
    </div>
  );
}

const Card = ({ label, value }: { label: string; value: number }) => (
  <div className="card"><small>{label}</small><strong>{value.toLocaleString('vi-VN')}</strong></div>
);

const Bar = ({ label, value, max }: { label: string; value: number; max: number }) => (
  <div className="bar">
    <span>{label}</span>
    <div><i style={{ width: `${(value / max) * 100}%` }} /></div>
    <b>{value}</b>
  </div>
);
