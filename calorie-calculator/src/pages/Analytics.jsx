import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { apiFetch } from '../lib/api.js';
import * as offlineStore from '../lib/offlineStore.js';

// ─── Chart color palette (explicit hex — never inherit from CSS vars) ─────────
const CHART = {
  calories:   '#34d399',   // emerald-teal — primary
  avgCalorie: '#818cf8',   // indigo — secondary
  protein:    '#f472b6',   // rose/pink
  carbs:      '#60a5fa',   // blue
  fat:        '#fbbf24',   // amber/gold
  grid:       'rgba(255,255,255,0.06)',
  axis:       '#546480',
  dot:        '#34d399',
  activeDot:  '#6ee7b7',
};

const MACRO_COLORS = ['#f472b6', '#60a5fa', '#fbbf24'];

// ─── Shared tooltip style ─────────────────────────────────────────────────────
const TooltipStyle = {
  backgroundColor: '#1f2d45',
  border: '1px solid rgba(52,211,153,0.3)',
  borderRadius: '12px',
  color: '#e8eef8',
  fontSize: '0.82rem',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  padding: '10px 14px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
};

// ─── Custom tooltip component ─────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TooltipStyle}>
      <p style={{ fontWeight: 700, marginBottom: 6, color: '#e8eef8' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '3px 0', fontSize: '0.8rem' }}>
          {p.name}: <strong>{Number(p.value).toFixed(0)}</strong>
        </p>
      ))}
    </div>
  );
}

function MacroTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TooltipStyle}>
      <p style={{ fontWeight: 700, color: payload[0]?.payload?.color || '#e8eef8' }}>
        {payload[0]?.name}
      </p>
      <p style={{ color: '#e8eef8', fontSize: '0.82rem' }}>
        {Number(payload[0]?.value || 0).toFixed(1)}g
      </p>
    </div>
  );
}

// ─── Custom pie label ─────────────────────────────────────────────────────────
function CustomPieLabel({ cx, cy, midAngle, outerRadius, name, value }) {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (value < 1) return null;
  return (
    <text
      x={x} y={y}
      fill="#8da0bc"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
      fontFamily="'Plus Jakarta Sans', sans-serif"
    >
      {name}: {Number(value).toFixed(1)}g
    </text>
  );
}

// ─── Macro bar row (replaces analytics-macro-row) ────────────────────────────
function MacroBar({ label, value, color, maxVal = 200 }) {
  const pct = Math.min((value / Math.max(maxVal, 1)) * 100, 100);
  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: '12px 16px',
      background: '#192438',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 8,
        fontSize: '0.88rem',
      }}>
        <strong style={{ color: '#e8eef8' }}>{label}</strong>
        <span style={{ color, fontWeight: 700 }}>{Number(value).toFixed(1)}g</span>
      </div>
      <div style={{
        height: 7, background: '#243352',
        borderRadius: 99, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color,
          borderRadius: 99,
          transition: 'width 0.6s ease',
          minWidth: value > 0 ? 4 : 0,
        }} />
      </div>
    </div>
  );
}

// ─── Main Analytics component ─────────────────────────────────────────────────
export default function Analytics({ userId, offline }) {
  const [weeklyData,  setWeeklyData]  = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (offline) {
        const weekRaw  = offlineStore.getWeeklyAggregates(userId);
        const monthRaw = offlineStore.getMonthlyAggregates(userId);
        setWeeklyData(normaliseWeek(weekRaw));
        setMonthlyData(normaliseMonth(monthRaw));
        setLoading(false);
        return;
      }
      try {
        const [weekRes, monthRes] = await Promise.all([
          apiFetch(`/analytics/weekly/${userId}`),
          apiFetch(`/analytics/monthly/${userId}`),
        ]);
        if (!weekRes.ok || !monthRes.ok) throw new Error('Fetch failed');
        const [weekData, monthData] = await Promise.all([weekRes.json(), monthRes.json()]);
        setWeeklyData(normaliseWeek(weekData));
        setMonthlyData(normaliseMonth(monthData));
      } catch (err) {
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [userId, offline]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '14rem', gap: '0.75rem', textAlign: 'center',
      }}>
        <div style={{
          width: 36, height: 36, border: '3px solid rgba(52,211,153,0.2)',
          borderTop: '3px solid #34d399', borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }} />
        <p style={{ color: '#8da0bc', fontSize: '0.9rem' }}>Loading insights…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // Compute summary stats
  const lastDay     = weeklyData[weeklyData.length - 1];
  const weekSlice   = weeklyData.slice(-7);
  const weekAvg     = weekSlice.reduce((s, d) => s + d.total_calories, 0) / Math.max(weekSlice.length, 1);
  const avgProtein  = weekSlice.reduce((s, d) => s + d.total_protein,  0) / Math.max(weekSlice.length, 1);

  const macroData = lastDay ? [
    { name: 'Protein', value: lastDay.total_protein, color: MACRO_COLORS[0] },
    { name: 'Carbs',   value: lastDay.total_carbs,   color: MACRO_COLORS[1] },
    { name: 'Fat',     value: lastDay.total_fat,      color: MACRO_COLORS[2] },
  ] : [];

  const macroMax = lastDay
    ? Math.max(lastDay.total_protein, lastDay.total_carbs, lastDay.total_fat, 1)
    : 1;

  return (
    <div className="page-stack">
      <div className="page-header">
        <h1>Insights</h1>
        <p>Calorie trends, macro breakdown, and monthly statistics from your logged meals.</p>
      </div>

      {/* ── Summary strip ── */}
      <div className="summary-grid">
        <div className="summary-card">
          <h3>{lastDay ? Math.round(lastDay.total_calories) : 0}</h3>
          <p>Today's calories</p>
        </div>
        <div className="summary-card">
          <h3>{Math.round(weekAvg)}</h3>
          <p>7-day average</p>
        </div>
        <div className="summary-card">
          <h3>{monthlyData.length}</h3>
          <p>Days tracked</p>
        </div>
        <div className="summary-card">
          <h3>{Math.round(avgProtein)}g</h3>
          <p>Avg daily protein</p>
        </div>
      </div>

      {/* ── Weekly calorie line chart ── */}
      <div className="card analytics-chart-card">
        <h2>Weekly calorie intake</h2>
        {weeklyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={weeklyData}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="calGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#34d399" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke={CHART.grid}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke={CHART.axis}
                tick={{ fill: CHART.axis, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke={CHART.axis}
                tick={{ fill: CHART.axis, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: '#8da0bc', fontSize: '0.78rem', paddingTop: 12 }}
              />
              <Line
                type="monotone"
                dataKey="total_calories"
                name="Calories"
                stroke={CHART.calories}
                strokeWidth={2.5}
                dot={{ fill: CHART.dot, r: 3, strokeWidth: 0 }}
                activeDot={{ fill: CHART.activeDot, r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="No weekly data yet — start logging meals to see trends." />
        )}
      </div>

      {/* ── Today's macro breakdown ── */}
      <div className="card analytics-chart-card">
        <h2>Today's macro breakdown</h2>
        {macroData.length > 0 && macroData.some(m => m.value > 0) ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
            alignItems: 'center',
          }}>
            {/* Pie chart */}
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={macroData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                  label={CustomPieLabel}
                >
                  {macroData.map((entry, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={entry.color}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip content={<MacroTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Macro bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {macroData.map(m => (
                <MacroBar
                  key={m.name}
                  label={m.name}
                  value={m.value}
                  color={m.color}
                  maxVal={macroMax}
                />
              ))}
            </div>
          </div>
        ) : (
          <EmptyChart message="No macro data for today — log a meal to see the breakdown." />
        )}
      </div>

      {/* ── Weekly macro breakdown bar chart ── */}
      {weeklyData.length > 0 && (
        <div className="card analytics-chart-card">
          <h2>Weekly macro trends</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={weeklyData}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              barSize={14}
              barGap={3}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                stroke={CHART.grid}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke={CHART.axis}
                tick={{ fill: CHART.axis, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke={CHART.axis}
                tick={{ fill: CHART.axis, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: '#8da0bc', fontSize: '0.78rem', paddingTop: 12 }}
              />
              <Bar dataKey="total_protein" name="Protein" fill={MACRO_COLORS[0]} radius={[4,4,0,0]} />
              <Bar dataKey="total_carbs"   name="Carbs"   fill={MACRO_COLORS[1]} radius={[4,4,0,0]} />
              <Bar dataKey="total_fat"     name="Fat"     fill={MACRO_COLORS[2]} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Monthly calorie trend ── */}
      <div className="card analytics-chart-card">
        <h2>Monthly calorie trend</h2>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={monthlyData}
              margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
              barSize={18}
              barGap={4}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                stroke={CHART.grid}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                angle={-40}
                textAnchor="end"
                height={70}
                stroke={CHART.axis}
                tick={{ fill: CHART.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke={CHART.axis}
                tick={{ fill: CHART.axis, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: '#8da0bc', fontSize: '0.78rem', paddingTop: 12 }}
              />
              <Bar
                dataKey="total_calories"
                name="Calories"
                fill={CHART.calories}
                radius={[4,4,0,0]}
              />
              <Bar
                dataKey="avg_calories"
                name="Avg daily"
                fill={CHART.avgCalorie}
                radius={[4,4,0,0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="No monthly data yet — keep logging to see your trend." />
        )}
      </div>

      {/* ── Monthly statistics table ── */}
      {monthlyData.length > 0 && (
        <div className="card analytics-chart-card">
          <h2>Monthly statistics</h2>
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Calories</th>
                  <th>Protein</th>
                  <th>Carbs</th>
                  <th>Fat</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.slice(-15).reverse().map(day => (
                  <tr key={day.date}>
                    <td>{day.date}</td>
                    <td style={{ color: CHART.calories }}>{Math.round(day.total_calories)}</td>
                    <td style={{ color: MACRO_COLORS[0] }}>{Number(day.total_protein).toFixed(1)}g</td>
                    <td style={{ color: MACRO_COLORS[1] }}>{Number(day.total_carbs).toFixed(1)}g</td>
                    <td style={{ color: MACRO_COLORS[2] }}>{Number(day.total_fat).toFixed(1)}g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function EmptyChart({ message }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '160px', color: '#546480', fontSize: '0.88rem',
      textAlign: 'center', padding: '1rem',
    }}>
      {message}
    </div>
  );
}

function normaliseWeek(raw = []) {
  return raw.map(d => ({
    ...d,
    total_calories: Number(d.total_calories || 0),
    total_protein:  Number(d.total_protein  || 0),
    total_carbs:    Number(d.total_carbs    || 0),
    total_fat:      Number(d.total_fat      || 0),
    date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
  }));
}

function normaliseMonth(raw = []) {
  return raw.map(d => ({
    ...d,
    total_calories: Number(d.total_calories || 0),
    total_protein:  Number(d.total_protein  || 0),
    total_carbs:    Number(d.total_carbs    || 0),
    total_fat:      Number(d.total_fat      || 0),
    avg_calories:   Number(d.avg_calories   || 0),
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));
}
