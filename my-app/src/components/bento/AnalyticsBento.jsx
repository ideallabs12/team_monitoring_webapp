import React, { useState, useEffect, useRef, useLayoutEffect, useId, useMemo } from "react";
import "./analytics-bento.css";

/* ---------------- helpers ---------------- */

const fmt = (n) => Math.round(n).toLocaleString("en-US");
const ease = (t) => 1 - Math.pow(1 - t, 3);

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

function useSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width),
        h = Math.round(e.contentRect.height);
      setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/** smooth path through points (catmull-rom as cubic beziers) */
function smooth(P) {
  const n = P.length;
  if (n < 2) return "";
  const g = (i) => P[Math.max(0, Math.min(n - 1, i))];
  let d = `M${P[0][0]},${P[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = g(i - 1),
      p1 = g(i),
      p2 = g(i + 1),
      p3 = g(i + 2),
      k = 0.18;
    d += `C${p1[0] + (p2[0] - p0[0]) * k},${p1[1] + (p2[1] - p0[1]) * k} ${p2[0] - (p3[0] - p1[0]) * k},${p2[1] - (p3[1] - p1[1]) * k} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function CountUp({ value, prefix = "", duration = 1100 }) {
  const ref = useRef(null);
  const from = useRef(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = prefix + fmt(value);
      from.current = value;
      return;
    }
    const a = from.current,
      t0 = performance.now();
    let raf = 0;
    const f = (now) => {
      const t = Math.min(1, (now - t0) / duration),
        v = a + (value - a) * ease(t);
      el.textContent = prefix + fmt(v);
      from.current = v;
      if (t < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [value, prefix, duration, reduce]);
  return <span ref={ref}>{prefix}0</span>;
}

/* ---------------- tooltip ---------------- */

function Tooltip({ mono, api }) {
  const [tip, setTip] = useState(null);
  const [pos, setPos] = useState({ l: 0, t: 0 });
  const box = useRef(null);
  useEffect(() => {
    api.current = {
      show: (x, y, t) => setTip({ ...t, x, y }),
      hide: () => setTip(null),
    };
    return () => {
      api.current = null;
    };
  }, [api]);

  useLayoutEffect(() => {
    if (!tip || !box.current) return;
    const r = box.current.getBoundingClientRect();
    let l = tip.x + 14,
      t = tip.y - r.height - 12;
    if (l + r.width > window.innerWidth - 8) l = tip.x - r.width - 14;
    if (t < 8) t = tip.y + 16;
    setPos({ l, t });
  }, [tip]);

  return (
    <div
      ref={box}
      role="tooltip"
      className="ab-tooltip"
      style={{
        left: pos.l,
        top: pos.t,
        opacity: tip ? 1 : 0,
      }}
    >
      {tip && (
        <>
          <div style={{ marginBottom: "4px", color: "var(--ab-muted-fg)" }}>
            {tip.title}
          </div>
          {tip.rows.map((r) => (
            <div
              key={r.label}
              className="ab-flex ab-items-center ab-justify-between"
              style={{ gap: "12px", marginTop: "3px" }}
            >
              <span
                className="ab-flex ab-items-center"
                style={{ gap: "6px", color: "var(--ab-muted-fg)" }}
              >
                {r.color && (
                  <i
                    style={{
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "2px",
                      background: r.color,
                    }}
                  />
                )}
                {r.label}
              </span>
              <b
                style={{
                  fontFamily: mono,
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 600,
                }}
              >
                {r.value}
              </b>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ---------------- shared bits ---------------- */

const Arrow = () => (
  <svg viewBox="0 0 12 12" style={{ width: "11px", height: "11px" }} aria-hidden="true">
    <path
      d="M6 10.5V1.5M2 5.5l4-4 4 4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Delta = ({ children, className = "" }) => (
  <span
    className={`ab-flex ab-items-center ab-text-emerald ${className}`}
    style={{ gap: "3px", fontWeight: 600, letterSpacing: "-0.02em" }}
  >
    <Arrow />
    {children}
  </span>
);

const Card = ({ className = "", children, ...rest }) => (
  <section className={`ab-card ${className}`} {...rest}>
    {children}
  </section>
);

function Segmented({ items, value, onChange, label }) {
  const refs = useRef([]);
  const [thumb, setThumb] = useState({ x: 0, w: 0 });

  useLayoutEffect(() => {
    const b = refs.current[value];
    if (b) setThumb({ x: b.offsetLeft, w: b.offsetWidth });
  }, [value, items]);

  return (
    <div role="tablist" aria-label={label} className="ab-segmented">
      <div
        className="ab-segmented-thumb"
        style={{
          width: thumb.w,
          transform: `translateX(${thumb.x - 2}px)`,
          left: 2,
        }}
      />
      {items.map((it, i) => (
        <button
          key={it}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="tab"
          type="button"
          aria-selected={i === value}
          onClick={() => onChange(i)}
          className="ab-segmented-btn"
          style={{
            color: i === value ? "var(--ab-card-fg)" : "var(--ab-muted-fg)",
          }}
        >
          {it}
        </button>
      ))}
    </div>
  );
}

/* ---------------- A: revenue line ---------------- */

function RevenueChart({ series, caption, prefix, colors, mono, tip }) {
  const [ref, { w: W, h: H }] = useSize();
  const reduce = useReducedMotion();
  const [drawn, setDrawn] = useState(false);
  const [hover, setHover] = useState(null);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    if (!W) return;
    const r = requestAnimationFrame(() =>
      requestAnimationFrame(() => setDrawn(true))
    );
    return () => cancelAnimationFrame(r);
  }, [W]);

  const vals = series.map((s) => s.value);
  const lo = Math.min(...vals),
    hi = Math.max(...vals),
    span = hi - lo || 1;
  const raw = span / 4,
    mag = Math.pow(10, Math.floor(Math.log10(raw))),
    step =
      [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const mn = lo - span * 0.45,
    mx = hi + span * 0.08,
    top = 30,
    bot = 14;
  const Y = (v) => top + (1 - (v - mn) / (mx - mn)) * (H - top - bot);
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step)
    ticks.push(v);
  const P = vals.map(
    (v, i) => [14 + (i / (vals.length - 1)) * (W - 66), Y(v)]
  );
  const d = W ? smooth(P) : "";
  const last = P[P.length - 1] || [0, 0];
  const compact = (v) =>
    v >= 1000 ? (v / 1000).toFixed(step < 1000 ? 1 : 0) + "K" : String(v);

  const move = (e) => {
    const r = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const i = Math.max(
      0,
      Math.min(
        vals.length - 1,
        Math.round(((e.clientX - r.left - 14) / (W - 66)) * (vals.length - 1))
      )
    );
    setHover(i);
    tip.current?.show(r.left + P[i][0], r.top + P[i][1], {
      title: series[i].label,
      rows: [{ label: "Revenue", value: prefix + fmt(vals[i]), color: colors[1] }],
    });
  };

  return (
    <div
      ref={ref}
      className="ab-chart-box ab-flex-1"
      style={{ minHeight: "130px" }}
    >
      {caption && (
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            left: "12px",
            top: "10px",
            fontSize: "11px",
            letterSpacing: "-0.01em",
            color: "var(--ab-muted-fg)",
          }}
        >
          {caption}
        </div>
      )}
      {W > 0 && (
        <svg
          width={W}
          height={H}
          style={{ display: "block" }}
          role="img"
          aria-label={`${caption ?? "Revenue"}: from ${prefix}${fmt(vals[0])} to ${prefix}${fmt(vals[vals.length - 1])}`}
        >
          <defs>
            <linearGradient id={`${id}l`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" style={{ stopColor: colors[0] }} />
              <stop offset="1" style={{ stopColor: colors[1] }} />
            </linearGradient>
            <linearGradient id={`${id}a`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" style={{ stopColor: colors[1], stopOpacity: 0.18 }} />
              <stop offset="1" style={{ stopColor: colors[1], stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id={`${id}m`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
              <stop offset="1" stopColor="#fff" stopOpacity="1" />
            </linearGradient>
            <mask id={`${id}k`}>
              <rect width={W} height={H} fill={`url(#${id}m)`} />
            </mask>
          </defs>
          {ticks.map((v) => (
            <g key={v}>
              <line
                x1={0}
                x2={W}
                y1={Y(v)}
                y2={Y(v)}
                className="ab-stroke-border"
                strokeWidth={1}
              />
              <text
                x={W - 10}
                y={Y(v) - 5}
                textAnchor="end"
                fontSize={10}
                className="ab-fill-muted"
                style={{ fontFamily: mono }}
              >
                {compact(v)}
              </text>
            </g>
          ))}
          <path
            d={`${d}L${last[0]},${H}L${P[0][0]},${H}Z`}
            fill={`url(#${id}a)`}
            mask={`url(#${id}k)`}
          />
          <path
            d={d}
            pathLength={1}
            fill="none"
            stroke={`url(#${id}l)`}
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: drawn || reduce ? 0 : 1,
              transition: reduce
                ? "none"
                : "stroke-dashoffset 1.4s cubic-bezier(.3,.8,.2,1) .2s",
            }}
          />
          <circle
            cx={last[0]}
            cy={last[1]}
            r={4.5}
            style={{ fill: colors[1] }}
            className="ab-stroke-card"
            strokeWidth={2}
          />
          {hover !== null && P[hover] && (
            <>
              <line
                x1={P[hover][0]}
                x2={P[hover][0]}
                y1={0}
                y2={H}
                className="ab-stroke-muted-50"
                strokeWidth={1}
              />
              <circle
                cx={P[hover][0]}
                cy={P[hover][1]}
                r={4.5}
                style={{ fill: colors[1] }}
                className="ab-stroke-card"
                strokeWidth={2}
              />
            </>
          )}
          <rect
            width={W}
            height={H}
            fill="transparent"
            onPointerMove={move}
            onPointerLeave={() => {
              setHover(null);
              tip.current?.hide();
            }}
          />
        </svg>
      )}
    </div>
  );
}

/* ---------------- B: desktop vs mobile waves ---------------- */

function SessionsChart({ desktop, mobile, labels, colors, tip }) {
  const [ref, { w: W, h: H }] = useSize();
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const paths = useRef([]);
  const [hover, setHover] = useState(null);
  const n = desktop[0]?.length ?? 0;
  const max = Math.max(1, ...desktop.flat(), ...mobile.flat());
  const pad = 18,
    mid = H / 2,
    amp = H / 2 - 14;
  const X = (i) => pad + 6 + (i / (n - 1)) * (W - 2 * pad - 12);
  const sets = useMemo(
    () => [
      ...desktop.map((a, k) => ({ a, dir: -1, k, g: "d" })),
      ...mobile.map((a, k) => ({ a, dir: 1, k, g: "m" })),
    ],
    [desktop, mobile]
  );

  useEffect(() => {
    if (!W || !H) return;
    let raf = 0;
    const t0 = performance.now();
    const frame = (now) => {
      const t = (now - t0) / 1000,
        grow = reduce ? 1 : ease(Math.min(1, t / 1.3));
      sets.forEach((s, j) => {
        const breathe = reduce ? 1 : 1 + Math.sin(t * 1.2 + s.k * 0.9) * 0.035;
        const P = s.a.map((v, i) => [
          X(i),
          mid + s.dir * (3 + (v / max) * amp * grow * breathe),
        ]);
        paths.current[j]?.setAttribute("d", smooth(P));
      });
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [W, H, sets, reduce, max]);

  const move = (e) => {
    const r = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const i = Math.max(
      0,
      Math.min(
        n - 1,
        Math.round(((e.clientX - r.left - pad - 6) / (W - 2 * pad - 12)) * (n - 1))
      )
    );
    setHover(i);
    tip.current?.show(r.left + X(i), r.top + 12, {
      title: `${String(i % 24).padStart(2, "0")}:00 · ${labels.current}`,
      rows: [
        { label: labels.desktop, value: fmt(desktop[0][i]), color: colors.desktop[0] },
        { label: labels.mobile, value: fmt(mobile[0][i]), color: colors.mobile[1] },
      ],
    });
  };

  return (
    <div
      ref={ref}
      className="ab-chart-box ab-flex-1"
      style={{ minHeight: "140px" }}
    >
      {W > 0 && (
        <svg
          width={W}
          height={H}
          style={{ display: "block" }}
          role="img"
          aria-label={`${labels.desktop} and ${labels.mobile} by hour`}
        >
          <defs>
            <linearGradient id={`${id}d`} x1="0" x2="1" y1="0" y2="0">
              <stop offset=".1" style={{ stopColor: colors.desktop[0] }} />
              <stop offset=".9" style={{ stopColor: colors.desktop[1] }} />
            </linearGradient>
            <linearGradient id={`${id}m`} x1="0" x2="1" y1="0" y2="0">
              <stop offset=".15" style={{ stopColor: colors.mobile[0] }} />
              <stop offset=".85" style={{ stopColor: colors.mobile[1] }} />
            </linearGradient>
          </defs>
          {Array.from({ length: 9 }, (_, i) => 10 + ((H - 20) * i) / 8).map((y) => (
            <g key={y} className="ab-stroke-muted-50">
              <line x1={8} x2={14} y1={y} y2={y} strokeWidth={1} />
              <line x1={W - 14} x2={W - 8} y1={y} y2={y} strokeWidth={1} />
            </g>
          ))}
          <line
            x1={pad + 6}
            x2={W - pad - 6}
            y1={mid}
            y2={mid}
            className="ab-stroke-border"
            strokeWidth={1}
          />
          {sets.map((s, j) => (
            <path
              key={`${s.g}${s.k}`}
              ref={(el) => {
                paths.current[j] = el;
              }}
              fill="none"
              stroke={`url(#${id}${s.g})`}
              strokeWidth={s.k === 0 ? 2.5 : 1.6}
              strokeLinecap="round"
              opacity={s.k === 0 ? 1 : s.k === 1 ? 0.55 : 0.3}
            />
          ))}
          {hover !== null && (
            <line
              x1={X(hover)}
              x2={X(hover)}
              y1={4}
              y2={H - 4}
              className="ab-stroke-muted-60"
              strokeWidth={1}
            />
          )}
          <rect
            width={W}
            height={H}
            fill="transparent"
            onPointerMove={move}
            onPointerLeave={() => {
              setHover(null);
              tip.current?.hide();
            }}
          />
        </svg>
      )}
    </div>
  );
}

/* ---------------- C: treemap ---------------- */

function squarify(items, x, y, w, h) {
  // Only process items that have positive value
  const validItems = items.filter((it) => it && Number(it.v) > 0);
  if (!validItems.length || w <= 0 || h <= 0) return [];

  // If only 1 item, it gets 100% of the treemap container
  if (validItems.length === 1) {
    return [{ ...validItems[0], x, y, w, h }];
  }

  const total = validItems.reduce((a, b) => a + Number(b.v || 0), 0);
  if (total <= 0) return [];

  const scale = (w * h) / total;
  let rest = validItems.map((i) => ({ ...i, a: Number(i.v || 0) * scale }));

  const worst = (row, len) => {
    if (!len || len <= 0) return Infinity;
    const s = row.reduce((a, b) => a + b.a, 0);
    if (s <= 0) return Infinity;
    const mx = Math.max(...row.map((r) => r.a));
    const mn = Math.min(...row.map((r) => r.a));
    if (mn <= 0) return Infinity;
    return Math.max((len * len * mx) / (s * s), (s * s) / (len * len * mn));
  };

  const out = [];
  let curX = x,
    curY = y,
    curW = w,
    curH = h;

  while (rest.length > 0) {
    const len = Math.min(curW, curH);
    if (len <= 0) break;
    const row = [rest[0]];
    let i = 1;
    while (i < rest.length && worst([...row, rest[i]], len) <= worst(row, len)) {
      row.push(rest[i++]);
    }
    rest = rest.slice(i);
    const s = row.reduce((a, b) => a + b.a, 0);
    if (curW >= curH) {
      const cw = curH > 0 ? s / curH : 0;
      let cy = curY;
      for (const r of row) {
        const rh = cw > 0 ? r.a / cw : 0;
        out.push({ ...r, x: curX, y: cy, w: cw, h: rh });
        cy += rh;
      }
      curX += cw;
      curW -= cw;
    } else {
      const rh = curW > 0 ? s / curW : 0;
      let cx = curX;
      for (const r of row) {
        const rw = rh > 0 ? r.a / rh : 0;
        out.push({ ...r, x: cx, y: curY, w: rw, h: rh });
        cx += rw;
      }
      curY += rh;
      curH -= rh;
    }
  }
  return out;
}

const TileIcon = () => (
  <svg
    viewBox="0 0 14 14"
    style={{ width: "14px", height: "14px", flexShrink: 0 }}
    aria-hidden="true"
  >
    <rect x="1" y="1" width="12" height="12" rx="4" fill="currentColor" opacity=".9" />
    <path d="M7 3.6l1 2.4 2.4 1-2.4 1L7 10.4 6 8 3.6 7 6 6z" fill="var(--tile-bg)" />
  </svg>
);

function Treemap({ data, period, mono, tip }) {
  const [ref, { w: W, h: H }] = useSize();
  const [placed, setPlaced] = useState(false);
  useEffect(() => {
    if (W) {
      const r = requestAnimationFrame(() =>
        requestAnimationFrame(() => setPlaced(true))
      );
      return () => cancelAnimationFrame(r);
    }
  }, [W]);

  const G = 6;
  const activeItems = (data.items || [])
    .map((i) => ({
      id: i.id || i.name,
      name: i.name,
      group: i.group,
      v: Number(i.values?.[period] ?? 0),
    }))
    .filter((i) => i.v > 0)
    .sort((a, b) => b.v - a.v);

  const total = activeItems.reduce((a, b) => a + b.v, 0) || 1;
  const containerW = W > 0 ? W : 600;
  const containerH = 320;
  const rects = containerW ? squarify(activeItems, 0, 0, containerW, containerH) : [];

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        marginTop: "6px",
        height: `${containerH}px`,
        minHeight: `${containerH}px`,
      }}
      role="img"
      aria-label={`${data.title}, ${data.periods[period]?.label}`}
    >
      {rects.length === 0 ? (
        <div
          className="ab-flex ab-items-center ab-justify-center"
          style={{
            height: "100%",
            borderRadius: "14px",
            border: "1px dashed var(--ab-border)",
            color: "var(--ab-muted-fg)",
            fontSize: "13px",
          }}
        >
          No contributor revenue logged for this period yet
        </div>
      ) : (
        rects.map((r, idx) => {
          const g = data.groups.find((x) => x.id === r.group) || {
            color: "#4f46e5",
            name: "Team",
          };
          const w = Math.max(0, isNaN(r.w) ? 0 : r.w - G);
          const h = Math.max(0, isNaN(r.h) ? 0 : r.h - G);
          const share =
            ((r.v / total) * 100).toFixed(1).replace(/\.?0+$/, "") + "%";
          const chars = fmt(r.v).length;
          let fs = Math.min(28, (w - 24 - 45) / (chars * 0.62)),
            showPct = true;
          if (fs < 16) {
            showPct = false;
            fs = Math.min(28, (w - 24) / (chars * 0.62));
          }
          const tiny = fs < 11 || h < 48 || w < 54;
          const showName = h >= 48 && w >= 64;
          const ink =
            g.ink === "light"
              ? "#ffffff"
              : g.ink === "dark"
              ? "#0a0a0a"
              : "var(--ab-card-fg)";

          return (
            <div
              key={r.id || `${r.name}-${r.group}-${idx}`}
              style={{
                position: "absolute",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                overflow: "hidden",
                borderRadius: "14px",
                padding: "10px 12px",
                transition:
                  "left 600ms cubic-bezier(.2,.9,.25,1), top 600ms cubic-bezier(.2,.9,.25,1), width 600ms cubic-bezier(.2,.9,.25,1), height 600ms cubic-bezier(.2,.9,.25,1), filter 200ms ease",
                left: placed ? r.x : containerW / 2,
                top: placed ? r.y : containerH / 2,
                width: placed ? w : 0,
                height: placed ? h : 0,
                background: g.color,
                "--tile-bg": g.color,
                color: ink,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
              onPointerMove={(e) =>
                tip.current?.show(e.clientX, e.clientY, {
                  title: `${data.periods[period]?.label} · ${g.name}`,
                  rows: [
                    { label: r.name, value: `$${fmt(r.v)}`, color: g.color },
                    { label: "Share", value: share },
                  ],
                })
              }
              onPointerLeave={() => tip.current?.hide()}
            >
              <div
                className="ab-flex ab-items-center"
                style={{
                  gap: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                <TileIcon />
                {showName && (
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.name}
                  </span>
                )}
              </div>
              {!tiny && (
                <div
                  className="ab-flex ab-items-end ab-justify-between"
                  style={{ gap: "6px" }}
                >
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: `${Math.max(13, fs)}px`,
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 600,
                      lineHeight: 1,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    <CountUp value={r.v} duration={800} prefix="$" />
                  </span>
                  {showPct && (
                    <span
                      style={{
                        borderRadius: "5px",
                        background: "rgba(0,0,0,0.75)",
                        padding: "2px 5px",
                        fontSize: "10px",
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        color: "#ffffff",
                        fontFamily: mono,
                      }}
                    >
                      {share}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ---------------- D: seasonality radar ---------------- */

function Radar({ values, axis, year, color, prefix, mono, tip }) {
  const [ref, { w }] = useSize();
  const reduce = useReducedMotion();
  const line = useRef(null);
  const cur = useRef(null);
  const [hover, setHover] = useState(null);
  const N = values.length,
    S = Math.min(w || 300, 420),
    R = S / 2 - 34,
    C = S / 2;
  const ang = (i) => -Math.PI / 2 + (i / N) * Math.PI * 2;

  /* a low-order Fourier fit keeps the lobes round and even */
  const norm = (v) => {
    const lo = Math.min(...v),
      hi = Math.max(...v);
    return v.map((x) => 0.42 + ((x - lo) / (hi - lo || 1)) * 0.58);
  };
  const fit = (v) => {
    const K = Math.min(5, Math.floor(N / 2)),
      co = [];
    for (let k = 0; k <= K; k++) {
      let a = 0,
        b = 0;
      v.forEach((x, i) => {
        const th = (i / N) * Math.PI * 2;
        a += x * Math.cos(k * th);
        b += x * Math.sin(k * th);
      });
      co.push([(a * (k ? 2 : 1)) / N, (b * (k ? 2 : 1)) / N]);
    }
    return (th) =>
      co.reduce(
        (r, [a, b], k) => r + a * Math.cos(k * th) + b * Math.sin(k * th),
        0
      );
  };
  const at = (f, th) => {
    const v = Math.max(0.05, f(th)),
      a = -Math.PI / 2 + th;
    return [
      C + Math.cos(a) * (R * 0.2 + v * R * 0.8),
      C + Math.sin(a) * (R * 0.2 + v * R * 0.8),
    ];
  };
  const shape = (v) => {
    const f = fit(norm(v));
    let d = "";
    for (let j = 0; j <= 180; j++) {
      const p = at(f, (j / 180) * Math.PI * 2);
      d += (j ? "L" : "M") + p[0].toFixed(2) + "," + p[1].toFixed(2);
    }
    return d + "Z";
  };
  const point = (v, i) => at(fit(norm(v)), (i / N) * Math.PI * 2);

  useEffect(() => {
    if (!S) return;
    const from = cur.current ?? values.map(() => 1),
      to = values,
      t0 = performance.now();
    let raf = 0;
    const step = (now) => {
      const t = reduce ? 1 : ease(Math.min(1, (now - t0) / 900));
      cur.current = from.map((v, i) => v + (to[i] - v) * t);
      line.current?.setAttribute("d", shape(cur.current));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [values, S, reduce]);

  const move = (e) => {
    const r = e.currentTarget.ownerSVGElement.getBoundingClientRect(),
      x = e.clientX - r.left - C,
      y = e.clientY - r.top - C;
    if (Math.hypot(x, y) < R * 0.2) {
      setHover(null);
      tip.current?.hide();
      return;
    }
    let a = Math.atan2(y, x) + Math.PI / 2;
    if (a < 0) a += Math.PI * 2;
    const i = Math.round((a / (Math.PI * 2)) * N) % N,
      p = point(values, i);
    setHover(i);
    tip.current?.show(r.left + p[0], r.top + p[1], {
      title: `${axis[i]} ${year}`,
      rows: [{ label: "Sales", value: prefix + fmt(values[i]), color }],
    });
  };
  const hp = hover !== null ? point(values, hover) : null;

  return (
    <div
      ref={ref}
      style={{
        margin: "6px auto 0 auto",
        width: "100%",
        maxWidth: "420px",
        height: S || 300,
      }}
    >
      {S > 0 && (
        <svg
          width={S}
          height={S}
          style={{ margin: "0 auto", display: "block" }}
          role="img"
          aria-label={`Sales by month, ${year}`}
        >
          {[0.33, 0.66, 1].map((k) => (
            <circle
              key={k}
              cx={C}
              cy={C}
              r={R * k}
              fill="none"
              className="ab-stroke-border"
              strokeWidth={1}
            />
          ))}
          {axis.map((m, i) => (
            <g key={m}>
              <line
                x1={C + Math.cos(ang(i)) * R * 0.2}
                y1={C + Math.sin(ang(i)) * R * 0.2}
                x2={C + Math.cos(ang(i)) * R}
                y2={C + Math.sin(ang(i)) * R}
                className="ab-stroke-border"
                strokeWidth={1}
              />
              <text
                x={C + Math.cos(ang(i)) * (R + 18)}
                y={C + Math.sin(ang(i)) * (R + 18)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11}
                className="ab-fill-muted"
                style={{ fontFamily: mono }}
              >
                {m}
              </text>
            </g>
          ))}
          <path
            ref={line}
            fill="none"
            strokeWidth={2.5}
            strokeLinejoin="round"
            style={{ stroke: color }}
          />
          <circle
            cx={C}
            cy={C}
            r={R * 0.2}
            className="ab-fill-card ab-stroke-border"
            strokeWidth={1}
          />
          <g
            transform={`translate(${C - 11} ${C - 11})`}
            fill="none"
            style={{ stroke: "var(--ab-muted-fg)" }}
            strokeWidth={1.4}
            strokeLinejoin="round"
          >
            <path d="M11 1.5l8.5 5v9L11 20.5l-8.5-5v-9z M11 1.5v19 M2.5 6.5L19.5 15.5 M19.5 6.5L2.5 15.5" />
          </g>
          {hp && (
            <circle
              cx={hp[0]}
              cy={hp[1]}
              r={4.5}
              className="ab-stroke-card"
              strokeWidth={2}
              style={{ fill: color }}
            />
          )}
          <rect
            width={S}
            height={S}
            fill="transparent"
            onPointerMove={move}
            onPointerLeave={() => {
              setHover(null);
              tip.current?.hide();
            }}
          />
        </svg>
      )}
    </div>
  );
}

/* ---------------- vasnev.art badge ---------------- */

const V_ON = new Set(["0,0", "4,0", "1,1", "3,1", "2,2"]);
function VasnevBadge({ className = "" }) {
  return (
    <a
      href="https://vasnev.art"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Made by vasnev.art"
      className={`vb-badge ${className}`}
    >
      <span className="vb-mark" aria-hidden="true">
        {Array.from({ length: 15 }, (_, i) => {
          const x = i % 5,
            y = Math.floor(i / 5);
          return (
            <i
              key={i}
              className={V_ON.has(`${x},${y}`) ? "on" : undefined}
              style={{ ["--x"]: x }}
            />
          );
        })}
      </span>
      <span>
        <span className="vb-by">by</span> vasnev.art
      </span>
      <svg className="vb-arr" viewBox="0 0 12 12" aria-hidden="true">
        <path
          d="M3.5 8.5l5-5M4.5 3.5h4v4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <style>{`
.vb-badge{--vb-bg:#111113;--vb-line:rgba(255,255,255,.1);--vb-fg:#fff;--vb-mut:rgba(255,255,255,.5);--vb-off:rgba(255,255,255,.16);--vb-on:#6a5cff;
  display:inline-flex;align-items:center;gap:9px;height:34px;padding:0 12px 0 11px;border-radius:17px;background:var(--vb-bg);border:1px solid var(--vb-line);
  color:var(--vb-fg);text-decoration:none;font:500 13px/1 Geist,ui-sans-serif,system-ui,-apple-system,sans-serif;letter-spacing:-.02em;
  box-shadow:0 8px 24px -14px rgba(0,0,0,.25);transition:border-color .25s,transform .25s cubic-bezier(.2,.9,.25,1)}
.vb-badge:hover{border-color:color-mix(in srgb,var(--vb-on) 45%,transparent)}
.vb-badge:active{transform:scale(.97)}
.vb-badge:focus-visible{outline:2px solid var(--vb-on);outline-offset:2px}
.vb-mark{display:grid;grid-template-columns:repeat(5,3px);grid-template-rows:repeat(3,3px);gap:2px}
.vb-mark i{width:3px;height:3px;border-radius:50%;background:var(--vb-off);transition:background .3s}
.vb-mark i.on{background:var(--vb-on)}
.vb-badge:hover .vb-mark i.on{animation:vb-wave .9s cubic-bezier(.3,1.4,.4,1) calc(var(--x)*60ms) 1}
.vb-badge:hover .vb-mark i:not(.on){background:color-mix(in srgb,var(--vb-on) 22%,transparent)}
@keyframes vb-wave{0%,100%{transform:none}40%{transform:translateY(-2px) scale(1.35)}}
.vb-by{color:var(--vb-mut)}
.vb-arr{height:12px;width:0;margin-left:-9px;opacity:0;color:var(--vb-mut);transform:translate(-4px,4px);transition:width .3s cubic-bezier(.2,.9,.25,1),opacity .25s,transform .3s cubic-bezier(.2,.9,.25,1),margin .3s}
.vb-badge:hover .vb-arr{width:12px;margin-left:0;opacity:1;transform:none;color:var(--vb-fg)}
@media (prefers-reduced-motion: reduce){.vb-badge:hover .vb-mark i.on{animation:none}}
`}</style>
    </a>
  );
}

/* ---------------- the bento ---------------- */

export function AnalyticsBento({
  currency = "$",
  revenue,
  sessions,
  categories,
  seasonality,
  colors = {},
  fontFamily = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  monoFamily = "'Courier New', Courier, monospace",
  credit = true,
  className = "",
  style,
  ...rest
}) {
  const tip = useRef(null);
  const [period, setPeriod] = useState(0);
  const [year, setYear] = useState(0);
  const [shown, setShown] = useState(false);
  const [viewBy, setViewBy] = useState("contributors"); // "contributors" | "teams"

  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const c = {
    revenue: colors.revenue ?? ["var(--ab-rev-a)", "var(--ab-rev-b)"],
    desktop: colors.desktop ?? ["#22D3EE", "#3c2cff"],
    mobile: colors.mobile ?? ["#FFB800", "#FF3DA5"],
    radar: colors.radar ?? "var(--ab-radar)",
  };

  const mono = {
    fontFamily: monoFamily,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.04em",
  };

  const Y = seasonality.years[year];
  const sl = {
    desktop: "Desktop",
    mobile: "Mobile",
    prior: "Prior weeks",
    current: "this week",
    ...sessions.labels,
  };

  const enterClass = (i) =>
    `ab-enter ${shown ? "" : "ab-enter-start"} ${
      ["", "ab-delay-75", "ab-delay-150", "ab-delay-200"][i]
    }`;

  const enterStyle = (i) => ({
    opacity: shown ? 1 : 0,
    transform: shown ? "translateY(0)" : "translateY(14px)",
  });

  return (
    <div
      className={`ab-root ${className}`}
      style={{ fontFamily, ...style }}
      {...rest}
    >
      <div className="ab-grid-12">
        {/* 1. Revenue Card */}
        <Card
          className={`ab-col-12 ab-col-lg-5 ${enterClass(0)}`}
          style={enterStyle(0)}
          aria-label={revenue.label}
        >
          <div className="ab-flex ab-flex-1 ab-flex-col ab-sm-flex-row ab-gap-5">
            <div className="ab-shrink-0">
              <div className="ab-text-13 ab-text-muted">{revenue.label}</div>
              <div
                className="ab-text-38 ab-sm-text-44 ab-font-medium"
                style={{ ...mono, marginTop: "10px", lineHeight: 1 }}
              >
                <CountUp value={revenue.value} prefix={currency} />
                <Delta
                  className="ab-text-sm"
                  style={{ display: "inline-flex", marginLeft: "10px" }}
                >
                  {revenue.delta}
                </Delta>
              </div>
              {revenue.note && (
                <div
                  className="ab-text-13 ab-text-muted-80"
                  style={{ marginTop: "8px" }}
                >
                  {revenue.note}
                </div>
              )}
            </div>
            <RevenueChart
              series={revenue.series}
              caption={revenue.caption}
              prefix={currency}
              colors={c.revenue}
              mono={monoFamily}
              tip={tip}
            />
          </div>
        </Card>

        {/* 2. Sessions Card */}
        <Card
          className={`ab-col-12 ab-col-lg-7 ${enterClass(1)}`}
          style={enterStyle(1)}
          aria-label={sessions.label}
        >
          <div className="ab-flex ab-flex-1 ab-flex-col ab-sm-flex-row ab-gap-5">
            <div className="ab-shrink-0">
              <div className="ab-text-13 ab-text-muted">{sessions.label}</div>
              <div
                className="ab-text-38 ab-sm-text-44 ab-font-medium"
                style={{ ...mono, marginTop: "10px", lineHeight: 1 }}
              >
                <CountUp value={sessions.value} />
                <Delta
                  className="ab-text-sm"
                  style={{ display: "inline-flex", marginLeft: "10px" }}
                >
                  {sessions.delta}
                </Delta>
              </div>
              {sessions.note && (
                <div
                  className="ab-text-13 ab-text-muted-80"
                  style={{ marginTop: "8px" }}
                >
                  {sessions.note}
                </div>
              )}
              <div
                className="ab-flex ab-flex-wrap ab-gap-3-5 ab-text-xs ab-text-muted"
                style={{ marginTop: "14px" }}
              >
                <span className="ab-flex ab-items-center" style={{ gap: "6px" }}>
                  <i
                    style={{
                      height: "2px",
                      width: "14px",
                      borderRadius: "2px",
                      background: `linear-gradient(90deg,${c.desktop[0]},${c.desktop[1]})`,
                      display: "inline-block",
                    }}
                  />
                  {sl.desktop}
                </span>
                <span className="ab-flex ab-items-center" style={{ gap: "6px" }}>
                  <i
                    style={{
                      height: "2px",
                      width: "14px",
                      borderRadius: "2px",
                      background: `linear-gradient(90deg,${c.mobile[0]},${c.mobile[1]})`,
                      display: "inline-block",
                    }}
                  />
                  {sl.mobile}
                </span>
                {(sessions.desktop.length > 1 || sessions.mobile.length > 1) && (
                  <span className="ab-flex ab-items-center" style={{ gap: "6px" }}>
                    <i
                      style={{
                        height: "2px",
                        width: "14px",
                        borderRadius: "2px",
                        background: "rgba(148, 163, 184, 0.5)",
                        display: "inline-block",
                      }}
                    />
                    {sl.prior}
                  </span>
                )}
              </div>
            </div>
            <SessionsChart
              desktop={sessions.desktop}
              mobile={sessions.mobile}
              labels={sl}
              colors={{ desktop: c.desktop, mobile: c.mobile }}
              tip={tip}
            />
          </div>
        </Card>

        {/* 3. Categories Treemap Card */}
        <Card
          className={`ab-col-12 ab-col-lg-7 ${enterClass(2)}`}
          style={enterStyle(2)}
          aria-label={categories.title}
        >
          <div className="ab-flex ab-flex-col ab-sm-flex-row ab-items-start ab-sm-items-center ab-justify-between ab-gap-3">
            <div className="ab-flex ab-items-center ab-gap-3">
              <h2
                className="ab-font-semibold ab-text-17"
                style={{ margin: 0, letterSpacing: "-0.02em" }}
              >
                {categories.title}
              </h2>
              {categories.teamItems && categories.teamItems.length > 0 && (
                <div
                  style={{
                    display: "inline-flex",
                    borderRadius: "8px",
                    background: "var(--ab-muted)",
                    padding: "2px",
                    border: "1px solid var(--ab-border)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setViewBy("contributors")}
                    style={{
                      border: "none",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontWeight: 500,
                      cursor: "pointer",
                      background:
                        viewBy === "contributors"
                          ? "var(--ab-card-bg)"
                          : "transparent",
                      color:
                        viewBy === "contributors"
                          ? "var(--ab-card-fg)"
                          : "var(--ab-muted-fg)",
                      boxShadow:
                        viewBy === "contributors"
                          ? "0 1px 3px rgba(0,0,0,0.2)"
                          : "none",
                    }}
                  >
                    Contributors
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewBy("teams")}
                    style={{
                      border: "none",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontWeight: 500,
                      cursor: "pointer",
                      background:
                        viewBy === "teams" ? "var(--ab-card-bg)" : "transparent",
                      color:
                        viewBy === "teams"
                          ? "var(--ab-card-fg)"
                          : "var(--ab-muted-fg)",
                      boxShadow:
                        viewBy === "teams" ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                    }}
                  >
                    Teams
                  </button>
                </div>
              )}
            </div>
            <div className="ab-flex ab-flex-wrap ab-gap-3-5 ab-text-xs ab-text-muted">
              {categories.groups.map((g) => (
                <span
                  key={g.id}
                  className="ab-flex ab-items-center"
                  style={{ gap: "6px" }}
                >
                  <i
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "2px",
                      background: g.color,
                      display: "inline-block",
                    }}
                  />
                  {g.name}
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              margin: "18px 0",
            }}
          >
            {categories.periods.map((p, i) => (
              <button
                key={p.label}
                type="button"
                aria-pressed={i === period}
                onClick={() => setPeriod(i)}
                className="ab-period-btn"
              >
                <div
                  className="ab-flex ab-items-center"
                  style={{
                    gap: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                >
                  <i
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor:
                        i === period ? "#10b981" : "var(--ab-muted-fg)",
                      display: "inline-block",
                      transition: "background-color 200ms ease",
                    }}
                  />
                  {p.label}
                </div>
                <div
                  className="ab-text-xl ab-sm-text-28 ab-font-medium"
                  style={{
                    ...mono,
                    marginTop: "6px",
                    lineHeight: 1,
                  }}
                >
                  <CountUp value={p.total} prefix={currency} />
                  <Delta
                    className="ab-text-xs"
                    style={{
                      display: "inline-flex",
                      marginLeft: "6px",
                    }}
                  >
                    {p.delta}
                  </Delta>
                </div>
                <div
                  className="ab-text-xs ab-text-muted-80"
                  style={{ marginTop: "6px" }}
                >
                  {p.compare}
                </div>
              </button>
            ))}
          </div>

          <Treemap
            data={{
              ...categories,
              items:
                viewBy === "teams" && categories.teamItems?.length
                  ? categories.teamItems
                  : categories.items,
            }}
            period={period}
            mono={monoFamily}
            tip={tip}
          />

          {categories.table && (
            <table className="ab-table">
              <thead>
                <tr>
                  {categories.table.columns.map((h, i) => (
                    <th
                      key={h}
                      style={{ textAlign: i ? "right" : "left" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.table.rows.map((r) => (
                  <tr key={r.label}>
                    <td
                      className="ab-text-muted"
                      style={{ textAlign: "left" }}
                    >
                      {r.label}
                    </td>
                    {r.values.map((v, i) => (
                      <td
                        key={i}
                        style={{ textAlign: "right", ...mono }}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* 4. Seasonality Radar Card */}
        <Card
          className={`ab-col-12 ab-col-lg-5 ${enterClass(3)}`}
          style={enterStyle(3)}
          aria-label={seasonality.title}
        >
          <div className="ab-flex ab-flex-col ab-sm-flex-row ab-items-start ab-sm-items-center ab-justify-between ab-gap-3">
            <h2
              className="ab-font-semibold ab-text-17"
              style={{ margin: 0, letterSpacing: "-0.02em" }}
            >
              {seasonality.title}
            </h2>
            <Segmented
              label="Year"
              items={seasonality.years.map((y) => y.label)}
              value={year}
              onChange={setYear}
            />
          </div>

          <Radar
            values={Y.values}
            axis={
              seasonality.axis ?? [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
              ]
            }
            year={Y.label}
            color={c.radar}
            prefix={currency}
            mono={monoFamily}
            tip={tip}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "12px",
              marginTop: "8px",
            }}
          >
            {Y.stats.map((s) => (
              <div key={s.label}>
                <div className="ab-text-13 ab-text-muted">{s.label}</div>
                <div
                  className="ab-text-26 ab-sm-text-30 ab-font-medium"
                  style={{ ...mono, marginTop: "6px", lineHeight: 1 }}
                >
                  <CountUp value={s.value} prefix={currency} />
                </div>
                <div
                  className="ab-text-xs ab-text-muted-80 ab-flex ab-items-center"
                  style={{ marginTop: "6px", gap: "6px" }}
                >
                  <Delta>{s.delta}</Delta>
                  <span style={mono}>{s.note}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "14px" }}>
            {Y.rows.map((r) => (
              <div
                key={r.label}
                className="ab-flex ab-justify-between ab-border-t ab-text-sm"
                style={{ padding: "11px 0" }}
              >
                <span className="ab-text-muted">{r.label}</span>
                <span style={mono}>{r.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {credit && (
        <div
          className="ab-flex ab-justify-end"
          style={{ marginTop: "20px" }}
        >
          <VasnevBadge />
        </div>
      )}

      <Tooltip api={tip} mono={monoFamily} />
    </div>
  );
}

export default AnalyticsBento;

