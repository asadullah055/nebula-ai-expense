import { useEffect, useMemo, useState } from "react";
import { HiArrowRight, HiBanknotes, HiWallet } from "react-icons/hi2";
import { LuTrendingDown, LuTrendingUp } from "react-icons/lu";
import { RiHandCoinLine, RiRestaurant2Line } from "react-icons/ri";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import AppShell from "../components/AppShell";
import { authService } from "../services/authService";

const DONUT_COLORS = ["#6d4ed4", "#ec2330", "#ec6800", "#14b8a6", "#0ea5e9", "#f59e0b"];
const BAR_COLORS = ["#6d4ed4", "#9d86e8", "#c4b5fd", "#f43f5e", "#fb7185", "#fda4af"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const ordinal = (day) => {
  const number = Number(day || 0);
  if (number % 100 >= 11 && number % 100 <= 13) return `${number}th`;
  if (number % 10 === 1) return `${number}st`;
  if (number % 10 === 2) return `${number}nd`;
  if (number % 10 === 3) return `${number}rd`;
  return `${number}th`;
};

const formatDashboardDate = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${ordinal(date.getDate())} ${month} ${date.getFullYear()}`;
};

const withColors = (rows, palette) =>
  (rows || []).map((item, index) => ({
    ...item,
    value: Number(item.value || 0),
    color: palette[index % palette.length]
  }));

const SummaryCard = ({ icon, label, value, iconBg }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
    <div className="flex items-center gap-4">
      <div className={`grid h-14 w-14 place-items-center rounded-full text-white ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</h2>
      </div>
    </div>
  </article>
);

const DonutCard = ({ title, centerLabel, centerValue, rows }) => {
  const chartRows = rows.length ? rows : [{ label: "No Data", value: 1, color: "#94a3b8" }];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h3>

      <div className="relative mt-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartRows}
              dataKey="value"
              nameKey="label"
              innerRadius={82}
              outerRadius={120}
              paddingAngle={1}
              stroke="transparent"
            >
              {chartRows.map((item) => (
                <Cell key={`${title}-${item.label}`} fill={item.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-base text-slate-500 dark:text-slate-400">{centerLabel}</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{centerValue}</p>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
        {chartRows.map((item) => (
          <div key={`${title}-legend-${item.label}`} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
          </div>
        ))}
      </div>
    </article>
  );
};

const TransactionList = ({ title, rows, type }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <button
        type="button"
        className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        See All
        <HiArrowRight size={16} />
      </button>
    </div>

    <div className="space-y-3">
      {rows.length ? (
        rows.map((item) => {
          const isIncome = type ? type === "income" : item.type === "income";
          return (
            <div
              key={`${title}-${item.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <RiRestaurant2Line size={20} />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{formatDashboardDate(item.date)}</p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold ${
                  isIncome
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300"
                }`}
              >
                {isIncome ? "+" : "-"}
                {formatCurrency(item.amount)}
                {isIncome ? <LuTrendingUp size={16} /> : <LuTrendingDown size={16} />}
              </span>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">No data found.</p>
      )}
    </div>
  </article>
);

const DashboardPage = () => {
  const [selectedWorkspace, setSelectedWorkspace] = useState(localStorage.getItem("selectedWorkspace") || "");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const onWorkspaceChanged = (event) => {
      const workspaceName = event.detail?.workspaceName || localStorage.getItem("selectedWorkspace") || "";
      setSelectedWorkspace(workspaceName);
    };

    window.addEventListener("workspace:changed", onWorkspaceChanged);
    window.addEventListener("storage", onWorkspaceChanged);

    return () => {
      window.removeEventListener("workspace:changed", onWorkspaceChanged);
      window.removeEventListener("storage", onWorkspaceChanged);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await authService.getProtectedDashboard(
          selectedWorkspace ? { workspace: selectedWorkspace } : {}
        );
        setDashboardData(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedWorkspace]);

  const summary = dashboardData?.summary || { totalIncome: 0, totalExpenses: 0, totalBalance: 0 };
  const recentTransactions = dashboardData?.recentTransactions || [];
  const incomeRecent = dashboardData?.income?.recent || [];
  const expenseRecent = dashboardData?.expense?.recent || [];

  const financialRows = useMemo(
    () =>
      withColors(
        [
          { label: "Total Balance", value: Math.max(0, Number(summary.totalBalance || 0)) },
          { label: "Total Expenses", value: Number(summary.totalExpenses || 0) },
          { label: "Total Income", value: Number(summary.totalIncome || 0) }
        ],
        DONUT_COLORS
      ),
    [summary.totalBalance, summary.totalExpenses, summary.totalIncome]
  );

  const incomeRows = useMemo(
    () => withColors(dashboardData?.income?.byCategory || [], DONUT_COLORS),
    [dashboardData?.income?.byCategory]
  );

  const expenseBarRows = useMemo(
    () => withColors(dashboardData?.expense?.byCategory || [], BAR_COLORS),
    [dashboardData?.expense?.byCategory]
  );

  return (
    <AppShell activeKey="dashboard">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        Active workspace: <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedWorkspace || "Not selected"}</span>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          Loading dashboard data...
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <SummaryCard
              icon={<HiWallet size={24} />}
              label="Total Balance"
              value={formatCurrency(summary.totalBalance)}
              iconBg="bg-violet-500"
            />
            <SummaryCard
              icon={<HiBanknotes size={24} />}
              label="Total Income"
              value={formatCurrency(summary.totalIncome)}
              iconBg="bg-orange-500"
            />
            <SummaryCard
              icon={<RiHandCoinLine size={24} />}
              label="Total Expenses"
              value={formatCurrency(summary.totalExpenses)}
              iconBg="bg-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TransactionList title="Recent Transactions" rows={recentTransactions} />
            <DonutCard
              title="Financial Overview"
              centerLabel="Total Balance"
              centerValue={formatCurrency(summary.totalBalance)}
              rows={financialRows}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DonutCard
              title="Last 60 Days Income"
              centerLabel="Total Income"
              centerValue={formatCurrency(dashboardData?.income?.last60Total || 0)}
              rows={incomeRows}
            />
            <TransactionList title="Income" rows={incomeRecent} type="income" />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TransactionList title="Expenses" rows={expenseRecent} type="expense" />

            <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Last 30 Days Expenses</h3>

              <div className="mt-4 h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseBarRows} margin={{ top: 16, right: 10, bottom: 30, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-8} textAnchor="end" height={55} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {expenseBarRows.map((item) => (
                        <Cell key={`expense-cell-${item.label}`} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
        </>
      )}

      {dashboardData?.generatedAt && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Last sync: {new Date(dashboardData.generatedAt).toLocaleString()}</p>
      )}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}
    </AppShell>
  );
};

export default DashboardPage;
