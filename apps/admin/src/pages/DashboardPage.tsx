
import {
  DASHBOARD_POLL_MS,
  getStats,
  isBackendEnabled,
  LANGUAGES,
  vnDate,
  type LangCode,
  type Stats,
  type StatsFilter,
} from '@ddl/shared';
import { useEffect, useRef, useState } from 'react';

type Preset = '7' | '30' | '90' | 'custom';
const DAY_MS = 86_400_000;

export default function DashboardPage() {
  const [s, setS] = useState<Stats | null>(null);
  const [preset, setPreset] = useState<Preset>('7');
  const [from, setFrom] = useState(vnDate(new Date(Date.now() - 6 * DAY_MS)));
  const [to, setTo] = useState(vnDate());
  const [lang, setLang] = useState<LangCode | ''>('');
  const [offline, setOffline] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const req = useRef(0);

  const today = vnDate();
  const rangeOk = from <= to && to <= today;

  const filter: StatsFilter = (() => {
    if (preset === 'custom') {
      return { from, to, lang: lang || undefined };
    }

    const days = Number(preset);

    return {
      from: vnDate(new Date(Date.now() - (days - 1) * DAY_MS)),
      to: today,
      lang: lang || undefined,
    };
  })();

  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    if (!rangeOk) return;

    let alive = true;

    const load = () => {
      const mine = ++req.current;

      getStats(filter).then(
        (data) => {
          if (!alive || mine !== req.current) return;

          setS(data);
          setOffline(false);
          setUpdatedAt(new Date());
        },
        () => {
          if (alive && mine === req.current) setOffline(true);
        },
      );
    };

    load();

    const id = setInterval(load, DASHBOARD_POLL_MS);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [filterKey, rangeOk]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) {
    return (
      <div className="pad dashboard-page">
        <h1>Dashboard</h1>
        <div className="dashboard-loading">
          {offline ? 'Mất kết nối, đang thử lại…' : 'Đang tải dữ liệu…'}
        </div>
      </div>
    );
  }

  const maxLang = Math.max(1, ...Object.values(s.byLanguage));
  //const maxDay = Math.max(1, ...s.byDay.map((d) => d.count));

  const hasData =
    s.byDay.some((d) => d.count > 0) ||
    Object.values(s.byLanguage).some((n) => n > 0);

  return (
    <div className="pad dashboard-page">
      <header className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">QUẢN TRỊ HỆ THỐNG</p>
          <h1>Tổng quan</h1>
          <p className="dashboard-description">
            Theo dõi tình hình sử dụng DinhDocLapGuide.
          </p>
        </div>

        <div className="dashboard-status">
          <span className={`status-dot ${offline ? 'is-offline' : ''}`} />
          <span>{offline ? 'Đang mất kết nối' : 'Đang cập nhật'}</span>
        </div>
      </header>

      {offline && (
        <div className="dashboard-warning">
          Không thể tải dữ liệu mới. Đang giữ lại số liệu gần nhất
          {updatedAt && ` (cập nhật lúc ${updatedAt.toLocaleTimeString('vi-VN')})`}.
        </div>
      )}

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h2>Tình hình truy cập</h2>
            <p>Các chỉ số tổng quan của hệ thống</p>
          </div>
        </div>

        <div className="dashboard-cards">
          <Card
            label="Tổng người dùng"
            value={s.totalUsers}
            description="Tổng số người dùng được ghi nhận"
            variant="users"
          />

          <Card
            label="Đang truy cập"
            value={s.online}
            description="Số phiên đang hoạt động"
            variant="online"
          />

          <Card
            label="Đang sử dụng"
            value={s.playing}
            description="Số phiên đang phát nội dung"
            variant="playing"
          />
        </div>
      </section>

      <section className="dashboard-filter-panel">
        <div className="dashboard-section-heading">
          <div>
            <h2>Bộ lọc thống kê</h2>
            <p>Lựa chọn khoảng thời gian và ngôn ngữ cần xem</p>
          </div>
        </div>

        <div className="dashboard-filters">
          <label>
            Khoảng thời gian
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as Preset)}
            >
              <option value="7">7 ngày gần nhất</option>
              <option value="30">30 ngày gần nhất</option>
              <option value="90">90 ngày gần nhất</option>
              <option value="custom">Tùy chọn ngày</option>
            </select>
          </label>

          {preset === 'custom' && (
            <>
              <label>
                Từ ngày
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>

              <label>
                Đến ngày
                <input
                  type="date"
                  value={to}
                  min={from}
                  max={today}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </>
          )}

          <label>
            Ngôn ngữ
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as LangCode | '')}
            >
              <option value="">Tất cả ngôn ngữ</option>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!rangeOk && (
          <p className="dashboard-error">
            Khoảng ngày không hợp lệ. Ngày bắt đầu phải trước hoặc bằng ngày
            kết thúc và không được ở tương lai.
          </p>
        )}
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h2>Thống kê lượt nghe</h2>
            <p>Dữ liệu được phân tích theo bộ lọc đã chọn</p>
          </div>
        </div>

        {hasData ? (
          <div className="dashboard-charts">
            <section className="dashboard-chart-card">
              <div className="dashboard-chart-heading">
                <div>
                  <h3>Lượt nghe theo ngôn ngữ</h3>
                  <p>So sánh lượt nghe giữa các ngôn ngữ</p>
                </div>
              </div>

              <div className="dashboard-bars">
                {LANGUAGES.map((l) => (
                  <Bar
                    key={l.code}
                    label={l.label}
                    value={s.byLanguage[l.code]}
                    max={maxLang}
                  />
                ))}
              </div>
            </section>

            <section className="dashboard-chart-card">
  <div className="dashboard-chart-heading">
    <div>
      <h3>Lượt nghe theo ngày</h3>
      <p>{s.byDay.length} ngày trong khoảng đã chọn</p>
    </div>
  </div>

  <LineChart data={s.byDay} />
</section>
          </div>
        ) : (
          <div className="empty">
            Chưa có dữ liệu trong khoảng thời gian đã chọn.
          </div>
        )}
      </section>

      <footer className="dashboard-footer">
        <span>
          Nguồn dữ liệu: {isBackendEnabled() ? 'Máy chủ Supabase' : 'Dữ liệu giả lập'}
        </span>
        <span>
          Tự cập nhật mỗi {DASHBOARD_POLL_MS / 1000} giây
          {updatedAt && ` · Cập nhật lúc ${updatedAt.toLocaleTimeString('vi-VN')}`}
        </span>
      </footer>
    </div>
  );
}

function Card({
  label,
  value,
  description,
  variant,
}: {
  label: string;
  value: number;
  description: string;
  variant: 'users' | 'online' | 'playing';
}) {
  return (
    <article className={`dashboard-stat-card ${variant}`}>
      <div className="dashboard-stat-top">
        <span>{label}</span>
        <span className="dashboard-stat-indicator" />
      </div>

      <strong>{value.toLocaleString('vi-VN')}</strong>
      <p>{description}</p>
    </article>
  );
}

function Bar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  return (
    <div className="dashboard-bar">
      <span className="dashboard-bar-label" title={label}>
        {label}
      </span>

      <div className="dashboard-bar-track">
        <i style={{ width: `${(value / max) * 100}%` }} />
      </div>

      <b>{value.toLocaleString('vi-VN')}</b>
    </div>
  );
}

function LineChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const width = Math.max(760, data.length * 18);
  const height = 300;

  const left = 55;
  const right = 20;
  const top = 20;
  const bottom = 45;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const maxValue = Math.max(1, ...data.map((d) => d.count));
  const step = Math.max(1, Math.ceil(maxValue / 4));
  const yMax = step * 4;

  const getX = (index: number) =>
    data.length <= 1
      ? left + chartWidth / 2
      : left + (index / (data.length - 1)) * chartWidth;

  const getY = (value: number) =>
    top + chartHeight - (value / yMax) * chartHeight;

  const points = data
    .map((d, index) => `${getX(index)},${getY(d.count)}`)
    .join(' ');

  const labelIndexes = Array.from(
    new Set([
      0,
      Math.round((data.length - 1) * 0.25),
      Math.round((data.length - 1) * 0.5),
      Math.round((data.length - 1) * 0.75),
      data.length - 1,
    ]),
  ).filter((index) => index >= 0 && index < data.length);

  if (data.length === 0) {
    return <div className="empty">Chưa có dữ liệu lượt nghe theo ngày.</div>;
  }

  return (
    <div className="dashboard-line-chart-wrapper">
      <svg
        className="dashboard-line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Biểu đồ đường lượt nghe theo ngày"
      >
        {/* Đường lưới và trục Y */}
        {Array.from({ length: 5 }, (_, i) => {
          const value = step * i;
          const y = getY(value);

          return (
            <g key={i}>
              <line
                x1={left}
                y1={y}
                x2={width - right}
                y2={y}
                className="dashboard-line-grid"
              />

              <text
                x={left - 10}
                y={y + 4}
                textAnchor="end"
                className="dashboard-line-axis-label"
              >
                {value.toLocaleString('vi-VN')}
              </text>
            </g>
          );
        })}

        {/* Vùng màu dưới đường biểu diễn */}
        {data.length > 1 && (
          <polygon
            points={`${left},${getY(0)} ${points} ${getX(data.length - 1)},${getY(0)}`}
            className="dashboard-line-area"
          />
        )}

        {/* Đường biểu diễn */}
        {data.length > 1 && (
          <polyline
            points={points}
            className="dashboard-line-path"
          />
        )}

        {/* Điểm dữ liệu */}
        {data.map((d, index) => (
          <circle
            key={d.date}
            cx={getX(index)}
            cy={getY(d.count)}
            r={4}
            className="dashboard-line-point"
          >
            <title>
              {d.date}: {d.count.toLocaleString('vi-VN')} lượt nghe
            </title>
          </circle>
        ))}

        {/* Nhãn ngày trên trục X */}
        {labelIndexes.map((index) => (
          <text
            key={index}
            x={getX(index)}
            y={height - 15}
            textAnchor="middle"
            className="dashboard-line-axis-label"
          >
            {data[index].date}
          </text>
        ))}
      </svg>
    </div>
  );
}
