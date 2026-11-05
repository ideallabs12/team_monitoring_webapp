import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AnalyticsBento } from "../../components/bento/AnalyticsBento";
import { transformIdeallabsToBento } from "../../utils/bentoDataUtils";
import { supabase } from "../../supabaseClient";
import { fetchAllMonthlyRevenues } from "../../utils/revenueUtils";
import {
  ArrowLeft,
  Moon,
  Sun,
  CheckCircle2,
  Sparkles,
  Database,
  RefreshCw,
  Layers,
  BarChart3
} from "lucide-react";

/* ── Fallback 21st.dev Mock Data ────────────────────────────────────── */
const bell = (x, m, s) => Math.exp(-Math.pow((x - m) / s, 2) / 2);
const hours = Array.from({ length: 25 }, (_, h) => h);
const mockDesktop = [0, 1, 2].map((w) =>
  hours.map((h) =>
    Math.round(
      2400 *
        (1 - w * 0.16) *
        (bell(h, 13 - w * 0.6, 3.4) * 0.92 + bell(h, 20, 2.2) * 0.18)
    )
  )
);
const mockMobile = [0, 1, 2].map((w) =>
  hours.map((h) =>
    Math.round(
      2600 *
        (1 - w * 0.18) *
        (bell(h, 20.5 - w * 0.4, 3) * 0.95 + bell(h, 8, 1.8) * 0.2)
    )
  )
);
const mockRevenue = [
  7420, 7510, 7460, 7380, 7490, 7640, 7720, 7680, 7590, 7560, 7630, 7780,
  7900, 7960, 7910, 7850, 7880, 8010, 8140, 8230, 8190, 8120, 8260, 8430,
  8560, 8620, 8700, 8890, 9020, 9134,
];

const mock21stData = {
  revenue: {
    label: "Revenue",
    value: 9134,
    delta: "2.5%",
    note: "Avg. order $185",
    caption: "Last 30 days",
    series: mockRevenue.map((value, i) => ({
      value,
      label: new Date(2026, 8, 22 + i).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    })),
  },
  sessions: {
    label: "Sessions",
    value: 48210,
    delta: "12.4%",
    note: "By hour, last 3 weeks",
    desktop: mockDesktop,
    mobile: mockMobile,
    labels: {
      desktop: "Desktop",
      mobile: "Mobile",
      prior: "Prior weeks",
      current: "this week"
    }
  },
  categories: {
    title: "Sales by category",
    groups: [
      { id: "product", name: "Product", color: "#7CFF5B", ink: "dark" },
      { id: "eng", name: "Engineering", color: "#8B3DFF", ink: "light" },
      { id: "growth", name: "Growth", color: "#FFB800", ink: "dark" },
      { id: "brand", name: "Brand", color: "#FF5A1F", ink: "dark" },
      { id: "ops", name: "Ops", color: "rgba(148, 163, 184, 0.4)" },
    ],
    periods: [
      { label: "Weekly", total: 2197, delta: "19.6%", compare: "vs $1,340 last week" },
      { label: "Monthly", total: 8903, delta: "1.9%", compare: "vs $5,441 last month" },
      { label: "Yearly", total: 98134, delta: "22%", compare: "vs $76,330 last year" },
    ],
    items: [
      { name: "Design", group: "product", values: [509, 2140, 25600] },
      { name: "Research", group: "product", values: [353, 1460, 17800] },
      { name: "Frontend", group: "eng", values: [412, 1880, 22900] },
      { name: "DevOps", group: "eng", values: [551, 2010, 24100] },
      { name: "Testing", group: "eng", values: [532, 1720, 19400] },
      { name: "Backend", group: "eng", values: [498, 2230, 26800] },
      { name: "SMM", group: "growth", values: [445, 1590, 18100] },
      { name: "SEO", group: "growth", values: [290, 1310, 16900] },
      { name: "Content", group: "brand", values: [331, 1240, 13400] },
      { name: "Support", group: "ops", values: [380, 1120, 12300] },
      { name: "Legal", group: "ops", values: [118, 520, 6100] },
    ],
    table: {
      columns: ["City", "Weekly", "Monthly", "Yearly"],
      rows: [
        { label: "New York", values: ["$20,030", "$50,331", "$270,120"] },
        { label: "London", values: ["$18,782", "$40,795", "$210,650"] },
        { label: "Tokyo", values: ["$14,221", "$30,123", "$200,080"] },
      ],
    },
  },
  seasonality: {
    title: "Seasonality",
    years: [
      {
        label: "2026",
        values: [
          16120, 20540, 24440, 18460, 28080, 21580, 17160, 25740,
          30160, 22880, 32240, 23660,
        ],
        stats: [
          { label: "Monthly avg", value: 8097, delta: "19.6%", note: "44,214 orders" },
          { label: "Year total", value: 312134, delta: "2.5%", note: "301,002 orders" },
        ],
        rows: [
          { label: "New York", value: "201,192" },
          { label: "London", value: "192,054" },
          { label: "Tokyo", value: "161,300" },
        ],
      },
      {
        label: "2025",
        values: [
          13260, 16640, 18720, 22360, 20020, 15860, 14560, 19240,
          23920, 26260, 23140, 19760,
        ],
        stats: [
          { label: "Monthly avg", value: 6772, delta: "8.1%", note: "38,920 orders" },
          { label: "Year total", value: 304521, delta: "4.4%", note: "287,410 orders" },
        ],
        rows: [
          { label: "New York", value: "188,340" },
          { label: "London", value: "171,215" },
          { label: "Tokyo", value: "150,870" },
        ],
      },
    ],
  },
};

export default function AnalyticsBentoPreview() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [dataSource, setDataSource] = useState("real"); // "real" | "mock"
  const [loading, setLoading] = useState(true);
  const [realData, setRealData] = useState(null);
  const [statsSummary, setStatsSummary] = useState({ revenuesCount: 0, teamsCount: 0, profilesCount: 0 });

  const loadDatabaseData = async () => {
    setLoading(true);
    try {
      // 1. Fetch live Supabase records
      let teams = [];
      let profiles = [];
      let revenues = [];

      try {
        const [teamsRes, profilesRes, revs] = await Promise.all([
          supabase.from("teams").select("*"),
          supabase.from("profiles").select("*"),
          fetchAllMonthlyRevenues()
        ]);
        teams = teamsRes.data || [];
        profiles = profilesRes.data || [];
        revenues = revs || [];
      } catch (err) {
        console.warn("Live Supabase fetch error, fallbacking to local dump:", err);
      }

      // If Supabase returned empty or was blocked by auth, use the full database dump
      if (!revenues || revenues.length === 0) {
        const dumpRes = await fetch("/all_data_dump.json");
        if (dumpRes.ok) {
          const dump = await dumpRes.json();
          teams = dump.teams || [];
          profiles = dump.profiles || [];
          revenues = dump.revenues || [];
        }
      }

      setStatsSummary({
        revenuesCount: revenues.length,
        teamsCount: teams.length,
        profilesCount: profiles.length
      });

      // Transform real data into bento format
      const transformed = transformIdeallabsToBento({ revenues, teams, profiles });
      setRealData(transformed);
    } catch (error) {
      console.error("Failed to load real data for bento:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, []);

  const activeBentoData = useMemo(() => {
    if (dataSource === "real" && realData) {
      return realData;
    }
    return mock21stData;
  }, [dataSource, realData]);

  return (
    <div
      className={`ab-wrapper ${isDarkMode ? "dark" : "light"}`}
      style={{
        minHeight: "100vh",
        padding: "24px 16px 64px 16px",
        backgroundImage: isDarkMode
          ? "radial-gradient(circle, rgba(255, 255, 255, 0.08) 0 1px, transparent 1.4px)"
          : "radial-gradient(circle, rgba(0, 0, 0, 0.07) 0 1px, transparent 1.4px)",
        backgroundSize: "20px 13px",
        backgroundPosition: "-6px -1px",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* Top Control Bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "28px",
            padding: "16px 20px",
            borderRadius: "20px",
            background: isDarkMode ? "rgba(19, 27, 46, 0.75)" : "#ffffff",
            border: isDarkMode
              ? "1px solid rgba(255, 255, 255, 0.1)"
              : "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "10px",
                border: isDarkMode
                  ? "1px solid rgba(255,255,255,0.15)"
                  : "1px solid #e2e8f0",
                background: isDarkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9",
                color: isDarkMode ? "#f8fafc" : "#0f172a",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              <ArrowLeft size={16} /> Back
            </button>

            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: isDarkMode ? "#f8fafc" : "#0f172a",
                }}
              >
                <Sparkles size={18} color="#3BF08C" />
                21st.dev Premium Bento with Real Data
              </div>
              <p
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "12px",
                  color: isDarkMode ? "#94a3b8" : "#64748b",
                }}
              >
                {dataSource === "real"
                  ? `Active: Real Database (${statsSummary.revenuesCount} revenues · ${statsSummary.teamsCount} teams · ${statsSummary.profilesCount} profiles)`
                  : "Active: 21st.dev Original Demo Sample"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Data Source Selector */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px",
                borderRadius: "12px",
                background: isDarkMode ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9",
                border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0",
              }}
            >
              <button
                onClick={() => setDataSource("real")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "9px",
                  border: "none",
                  background:
                    dataSource === "real"
                      ? isDarkMode
                        ? "#10b981"
                        : "#059669"
                      : "transparent",
                  color: dataSource === "real" ? "#ffffff" : isDarkMode ? "#94a3b8" : "#64748b",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                <Database size={13} />
                My Real Data
              </button>

              <button
                onClick={() => setDataSource("mock")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "9px",
                  border: "none",
                  background:
                    dataSource === "mock"
                      ? isDarkMode
                        ? "#6366f1"
                        : "#4f46e5"
                      : "transparent",
                  color: dataSource === "mock" ? "#ffffff" : isDarkMode ? "#94a3b8" : "#64748b",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                <BarChart3 size={13} />
                21st Demo Data
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadDatabaseData}
              disabled={loading}
              title="Reload Database Records"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                border: isDarkMode ? "1px solid rgba(255,255,255,0.15)" : "1px solid #e2e8f0",
                background: isDarkMode ? "rgba(255,255,255,0.06)" : "#f8fafc",
                color: isDarkMode ? "#f8fafc" : "#0f172a",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "10px",
                border: isDarkMode
                  ? "1px solid rgba(255,255,255,0.15)"
                  : "1px solid #e2e8f0",
                background: isDarkMode ? "rgba(255,255,255,0.06)" : "#f8fafc",
                color: isDarkMode ? "#f8fafc" : "#0f172a",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
              }}
              title="Toggle Dark / Light Mode"
            >
              {isDarkMode ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#6366f1" />}
              {isDarkMode ? "Light" : "Dark"}
            </button>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: isDarkMode ? "#94a3b8" : "#64748b",
            }}
          >
            <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            <div>Loading and aggregating your database records...</div>
          </div>
        )}

        {/* The Bento Component with real data */}
        {!loading && activeBentoData && (
          <AnalyticsBento
            currency="$"
            revenue={activeBentoData.revenue}
            sessions={activeBentoData.sessions}
            categories={activeBentoData.categories}
            seasonality={activeBentoData.seasonality}
          />
        )}

        {/* Real Data Breakdown Guide */}
        <div
          style={{
            marginTop: "32px",
            padding: "22px 26px",
            borderRadius: "20px",
            background: isDarkMode ? "rgba(19, 27, 46, 0.5)" : "#ffffff",
            border: isDarkMode
              ? "1px solid rgba(255, 255, 255, 0.08)"
              : "1px solid rgba(0, 0, 0, 0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "15px",
              fontWeight: 600,
              color: isDarkMode ? "#f8fafc" : "#0f172a",
              marginBottom: "12px",
            }}
          >
            <CheckCircle2 size={18} color="#10b981" />
            How Your Data Maps to the 4 Premium Bento Cards
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
              fontSize: "13px",
              color: isDarkMode ? "#94a3b8" : "#64748b",
            }}
          >
            <div
              style={{
                padding: "14px",
                borderRadius: "14px",
                background: isDarkMode ? "rgba(255,255,255,0.03)" : "#f8fafc",
                border: isDarkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid #e2e8f0",
              }}
            >
              <strong style={{ color: isDarkMode ? "#f8fafc" : "#0f172a" }}>1. Revenue & Trend</strong>
              <p style={{ margin: "6px 0 0" }}>
                Displays real monthly revenue totals, month-over-month growth delta %, average deal size, and an 18-month historical trend line.
              </p>
            </div>

            <div
              style={{
                padding: "14px",
                borderRadius: "14px",
                background: isDarkMode ? "rgba(255,255,255,0.03)" : "#f8fafc",
                border: isDarkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid #e2e8f0",
              }}
            >
              <strong style={{ color: isDarkMode ? "#f8fafc" : "#0f172a" }}>2. Channel Waves</strong>
              <p style={{ margin: "6px 0 0" }}>
                Compares your top acquisition sources (<strong>LinkedIn vs Instagram</strong>) across time periods with harmonic wave animation.
              </p>
            </div>

            <div
              style={{
                padding: "14px",
                borderRadius: "14px",
                background: isDarkMode ? "rgba(255,255,255,0.03)" : "#f8fafc",
                border: isDarkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid #e2e8f0",
              }}
            >
              <strong style={{ color: isDarkMode ? "#f8fafc" : "#0f172a" }}>3. Treemap: Teams & Members</strong>
              <p style={{ margin: "6px 0 0" }}>
                Categorizes all active contributors under their respective <strong>Teams</strong> (PEERCITE, WYN, ICON, etc.) across Latest Month, Last 3M, and All-Time.
              </p>
            </div>

            <div
              style={{
                padding: "14px",
                borderRadius: "14px",
                background: isDarkMode ? "rgba(255,255,255,0.03)" : "#f8fafc",
                border: isDarkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid #e2e8f0",
              }}
            >
              <strong style={{ color: isDarkMode ? "#f8fafc" : "#0f172a" }}>4. Seasonality Fourier Radar</strong>
              <p style={{ margin: "6px 0 0" }}>
                Visualizes 12-month revenue seasonality across years (<strong>2026, 2025, 2024, 2023</strong>) with month-by-month Fourier fit and top teams.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
