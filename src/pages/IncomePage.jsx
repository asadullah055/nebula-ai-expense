import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { HiChevronDown, HiOutlineXMark } from "react-icons/hi2";
import { LuDownload, LuPlus, LuTrendingUp } from "react-icons/lu";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AppShell from "../components/AppShell";
import { authService } from "../services/authService";

const INCOME_NATURE_OPTIONS = ["Recurring Income", "Variable Income"];

const deriveProfileFromWorkspace = (workspaceName) => {
  const text = (workspaceName || "").toLowerCase();
  if (text.includes("personal")) return "Personal";
  if (text.includes("company")) return "Company";
  return workspaceName ? "Company" : "";
};

const startOfUtcDay = (dateValue) => {
  const date = new Date(dateValue);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const addUtcDays = (dateValue, days) => {
  const start = startOfUtcDay(dateValue);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + days));
};

const parseIsoToUtcDate = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const ordinal = (day) => {
  const number = Number(day || 0);
  if (number % 100 >= 11 && number % 100 <= 13) return `${number}th`;
  if (number % 10 === 1) return `${number}st`;
  if (number % 10 === 2) return `${number}nd`;
  if (number % 10 === 3) return `${number}rd`;
  return `${number}th`;
};

const formatIncomeChartDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${ordinal(date.getDate())} ${month}`;
};

const formatIncomeListDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${ordinal(date.getDate())} ${month} ${date.getFullYear()}`;
};

const buildRangeMeta = ({ mode, customFrom, customTo }) => {
  const now = new Date();

  if (mode === "all") {
    return { start: null, endExclusive: null, label: "All time", error: "" };
  }

  if (mode === "last10") {
    const endExclusive = addUtcDays(now, 1);
    const start = addUtcDays(endExclusive, -10);
    return { start, endExclusive, label: "Last 10 days", error: "" };
  }

  if (mode === "thisMonth") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endExclusive = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { start, endExclusive, label: "This month", error: "" };
  }

  if (mode === "custom") {
    const fromDate = parseIsoToUtcDate(customFrom);
    const toDate = parseIsoToUtcDate(customTo);

    if (!fromDate || !toDate) {
      return { start: null, endExclusive: null, label: "Custom date range", error: "Select both from and to dates" };
    }

    const start = fromDate <= toDate ? fromDate : toDate;
    const end = fromDate <= toDate ? toDate : fromDate;
    return {
      start,
      endExclusive: addUtcDays(end, 1),
      label: `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`,
      error: ""
    };
  }

  return { start: null, endExclusive: null, label: "All time", error: "" };
};

const IncomePage = () => {
  const [selectedWorkspace, setSelectedWorkspace] = useState(localStorage.getItem("selectedWorkspace") || "");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    localStorage.getItem("selectedWorkspaceId") || ""
  );
  const [selectedProfile, setSelectedProfile] = useState(
    localStorage.getItem("selectedProfile") ||
      deriveProfileFromWorkspace(localStorage.getItem("selectedWorkspace") || "")
  );
  const [incomeSources, setIncomeSources] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState({
    incomeSourceId: "",
    incomeNature: "",
    amount: "",
    entryDate: new Date().toISOString().slice(0, 10)
  });
  const [isIncomeTypeMenuOpen, setIsIncomeTypeMenuOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [rangeMode, setRangeMode] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const effectiveProfile = useMemo(
    () => selectedProfile || deriveProfileFromWorkspace(selectedWorkspace) || "",
    [selectedProfile, selectedWorkspace]
  );
  const rangeMeta = useMemo(
    () =>
      buildRangeMeta({
        mode: rangeMode,
        customFrom,
        customTo
      }),
    [rangeMode, customFrom, customTo]
  );

  const filteredSources = useMemo(() => {
    const byProfile = effectiveProfile
      ? incomeSources.filter((source) => source.profile === effectiveProfile)
      : incomeSources;

    if (!form.incomeNature) return [];
    return byProfile.filter((source) => source.type === form.incomeNature);
  }, [incomeSources, effectiveProfile, form.incomeNature]);

  useEffect(() => {
    if (!isAddModalOpen) return;
    if (!form.incomeSourceId) return;
    if (filteredSources.find((source) => source._id === form.incomeSourceId)) return;
    setForm((prev) => ({ ...prev, incomeSourceId: "" }));
  }, [filteredSources, form.incomeSourceId, isAddModalOpen]);

  useEffect(() => {
    const onWorkspaceChanged = (event) => {
      const workspaceId = event.detail?.workspaceId || localStorage.getItem("selectedWorkspaceId") || "";
      const workspaceName = event.detail?.workspaceName || localStorage.getItem("selectedWorkspace") || "";
      const profile =
        event.detail?.profile ||
        localStorage.getItem("selectedProfile") ||
        deriveProfileFromWorkspace(workspaceName);
      setSelectedWorkspaceId(workspaceId);
      setSelectedWorkspace(workspaceName);
      setSelectedProfile(profile);
    };

    window.addEventListener("workspace:changed", onWorkspaceChanged);
    window.addEventListener("storage", onWorkspaceChanged);
    return () => {
      window.removeEventListener("workspace:changed", onWorkspaceChanged);
      window.removeEventListener("storage", onWorkspaceChanged);
    };
  }, []);

  useEffect(() => {
    const loadIncomeData = async () => {
      const workspaceId = (selectedWorkspaceId || "").trim();
      if (!workspaceId) {
        setIncomeSources([]);
        setIncomes([]);
        setError("Please select a workspace to view incomes.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");
      try {
        const [sourcesRes, incomesRes] = await Promise.all([
          authService.listIncomeSources({
            workspaceId,
            ...(effectiveProfile ? { profile: effectiveProfile } : {})
          }),
          authService.listIncomes({
            workspaceId,
            ...(effectiveProfile ? { profile: effectiveProfile } : {})
          })
        ]);
        setIncomeSources(sourcesRes.incomeSources || []);
        setIncomes(incomesRes.entries || []);
      } catch (_error) {
        setError("Failed to load income data");
      } finally {
        setIsLoading(false);
      }
    };

    loadIncomeData();
  }, [selectedWorkspaceId, effectiveProfile]);

  useEffect(() => {
    if (!isAddModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAddModalOpen]);

  const openAddModal = () => {
    setFormError("");
    setIsIncomeTypeMenuOpen(false);
    setForm({
      incomeSourceId: "",
      incomeNature: "Recurring Income",
      amount: "",
      entryDate: new Date().toISOString().slice(0, 10)
    });
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsIncomeTypeMenuOpen(false);
    setIsAddModalOpen(false);
  };

  const onSubmitIncome = async (event) => {
    event.preventDefault();
    setFormError("");
    const workspaceId = (selectedWorkspaceId || "").trim();
    const workspaceName = (selectedWorkspace || "").trim();
    if (!workspaceId) {
      setFormError("Please select a workspace first");
      return;
    }
    if (!workspaceName) {
      setFormError("Please select a workspace first");
      return;
    }

    if (!form.incomeNature) {
      setFormError("Please select income nature");
      return;
    }
    if (!form.incomeSourceId) {
      setFormError("Please select income category");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setFormError("Amount must be greater than 0");
      return;
    }
    if (!form.entryDate) {
      setFormError("Date is required");
      return;
    }

    setFormLoading(true);
    try {
      const profile = effectiveProfile || deriveProfileFromWorkspace(workspaceName) || "Company";
      const response = await authService.createIncome({
        workspaceId,
        profile,
        incomeSourceId: form.incomeSourceId,
        incomeNature: form.incomeNature,
        amount: Number(form.amount),
        entryDate: form.entryDate
      });

      const created = response.entry;
      setIncomes((prev) => [
        {
          _id: created.id,
          incomeSourceName: created.incomeSourceName,
          incomeNature: created.incomeNature,
          amount: created.amount,
          profile: created.profile,
          workspaceName: created.workspaceName,
          entryDate: created.entryDate
        },
        ...prev
      ]);
      closeAddModal();
    } catch (err) {
      setFormError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Failed to add income");
    } finally {
      setFormLoading(false);
    }
  };

  const filteredIncomes = useMemo(() => {
    if (!rangeMeta.start || !rangeMeta.endExclusive) {
      return incomes;
    }

    const startTime = rangeMeta.start.getTime();
    const endTime = rangeMeta.endExclusive.getTime();
    return incomes.filter((item) => {
      const entryTime = new Date(item.entryDate).getTime();
      return entryTime >= startTime && entryTime < endTime;
    });
  }, [incomes, rangeMeta.start, rangeMeta.endExclusive]);

  const totalIncome = filteredIncomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const recurringIncomes = useMemo(
    () => filteredIncomes.filter((item) => item.incomeNature === "Recurring Income"),
    [filteredIncomes]
  );
  const variableIncomes = useMemo(
    () => filteredIncomes.filter((item) => item.incomeNature === "Variable Income"),
    [filteredIncomes]
  );
  const recurringTotal = recurringIncomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const variableTotal = variableIncomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const incomeChartRows = useMemo(() => {
    const sorted = [...filteredIncomes].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    return sorted.slice(-8).map((item, index) => ({
      id: `${item._id}-${index}`,
      amount: Number(item.amount || 0),
      name: item.incomeSourceName || "Income",
      dateLabel: formatIncomeChartDate(item.entryDate)
    }));
  }, [filteredIncomes]);

  const chartBarColors = useMemo(
    () => incomeChartRows.map((_, index) => (index % 2 === 0 ? "#6D4ED4" : "#B7A6E3")),
    [incomeChartRows]
  );

  const chartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <p className="font-semibold text-[var(--brand)]">{row?.name || "Income"}</p>
        <p className="text-slate-600 dark:text-slate-300">
          Amount: <span className="font-semibold text-slate-900 dark:text-slate-100">${Number(row?.amount || 0).toFixed(0)}</span>
        </p>
      </div>
    );
  };

  return (
    <AppShell activeKey="income">
      <article className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Income Overview</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Track your earnings over time and analyze your income trends.
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Active workspace: <span className="font-semibold">{selectedWorkspace || "Not selected"}</span>
              {effectiveProfile ? ` (${effectiveProfile})` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/60 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30"
          >
            <LuPlus size={16} />
            Add Income
          </button>
        </div>
      </article>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recurring Income</p>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              {recurringIncomes.length} items
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">${recurringTotal.toFixed(2)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Stable monthly earnings</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Variable Income</p>
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
              {variableIncomes.length} items
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">${variableTotal.toFixed(2)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">One-time or irregular earnings</p>
        </article>
      </section>

      <article className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Filter Incomes</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { key: "all", label: "All" },
              { key: "last10", label: "Last 10 days" },
              { key: "thisMonth", label: "This month" },
              { key: "custom", label: "Date to date" }
            ].map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setRangeMode(preset.key)}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                  rangeMode === preset.key
                    ? "bg-[var(--brand)] text-white ring-2 ring-white/75 ring-inset dark:ring-slate-200/80"
                    : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {rangeMode === "custom" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="w-full sm:w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[var(--brand)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="w-full sm:w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[var(--brand)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          )}

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Showing: {rangeMeta.label}</p>
          {rangeMeta.error && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{rangeMeta.error}</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Last 30 Days Income</h3>
          <div className="mt-4 h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeChartRows} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 12, fill: "#475569" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#475569" }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.18)" }} content={chartTooltip} />
                <Bar dataKey="amount" radius={[12, 12, 0, 0]}>
                  {incomeChartRows.map((row, index) => (
                    <Cell key={row.id} fill={chartBarColors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Income Sources</h3>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LuDownload size={15} />
              Download
            </button>
          </div>

          {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>}

          {!isLoading && filteredIncomes.length > 0 && (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {filteredIncomes.slice(0, 12).map((item) => (
                <div
                  key={item._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-14 w-14 items-center justify-center rounded-full text-2xl font-semibold ${
                        item.incomeNature === "Variable Income"
                          ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
                          : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                      }`}
                    >
                      {item.incomeNature === "Variable Income" ? "VI" : "RI"}
                    </span>
                    <div>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{item.incomeSourceName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatIncomeListDate(item.entryDate)}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">
                    +${Number(item.amount).toFixed(0)}
                    <LuTrendingUp size={16} />
                  </span>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !filteredIncomes.length && (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No income entries found for this selected date range.</p>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </p>
        )}
      </article>

      {isAddModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-black/50 px-4 py-4 backdrop-blur-[1px]"
            onClick={closeAddModal}
          >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Add Income</h3>
              <button
                type="button"
                onClick={closeAddModal}
                className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <HiOutlineXMark size={22} />
              </button>
            </div>

            <form onSubmit={onSubmitIncome} className="space-y-3.5 px-4 py-4">
              <label className="block text-base font-semibold text-slate-800 dark:text-slate-200">Income Nature</label>
              <div className="flex w-full rounded-xl border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                {INCOME_NATURE_OPTIONS.map((item) => {
                  const isActive = form.incomeNature === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        const nextSources = (effectiveProfile
                          ? incomeSources.filter((source) => source.profile === effectiveProfile)
                          : incomeSources
                        ).filter((source) => source.type === item);

                        setForm((prev) => ({
                          ...prev,
                          incomeNature: item,
                          incomeSourceId:
                            nextSources.find((source) => source._id === prev.incomeSourceId)?._id || ""
                        }));
                        setIsIncomeTypeMenuOpen(false);
                      }}
                      className={`flex-1 rounded-lg px-3 py-3 text-sm font-semibold transition ${
                        isActive
                          ? "bg-[var(--brand)] text-white ring-2 ring-white/75 ring-inset dark:ring-slate-200/80"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <label htmlFor="incomeSourceId" className="block text-base font-semibold text-slate-800 dark:text-slate-200">
                Income Type
              </label>
              <div className="relative">
                <button
                  id="incomeSourceId"
                  type="button"
                  onClick={() => setIsIncomeTypeMenuOpen((prev) => !prev)}
                  disabled={!form.incomeNature}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-base text-slate-900 outline-none transition focus:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <span>
                    {filteredSources.find((source) => source._id === form.incomeSourceId)?.name || "Select Income Type"}
                  </span>
                  <HiChevronDown className={`transition ${isIncomeTypeMenuOpen ? "rotate-180" : ""}`} size={18} />
                </button>

                {isIncomeTypeMenuOpen && (
                  <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {filteredSources.map((source) => (
                      <button
                        key={source._id}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, incomeSourceId: source._id }));
                          setIsIncomeTypeMenuOpen(false);
                        }}
                        className="w-full px-3 py-2.5 text-left text-base text-slate-900 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        {source.name}
                      </button>
                    ))}
                    {!filteredSources.length && (
                      <p className="px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400">
                        No income type found for selected nature.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <label htmlFor="amount" className="block text-base font-semibold text-slate-800 dark:text-slate-200">
                Amount
              </label>
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-[var(--brand)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />

              <label htmlFor="entryDate" className="block text-base font-semibold text-slate-800 dark:text-slate-200">
                Date
              </label>
              <input
                id="entryDate"
                type="date"
                value={form.entryDate}
                onChange={(event) => setForm((prev) => ({ ...prev, entryDate: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-[var(--brand)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />

              {formError && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                  {formError}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-70"
                >
                  {formLoading ? "Saving..." : "Add Income"}
                </button>
              </div>
            </form>
          </div>
          </div>,
          document.body
        )}
    </AppShell>
  );
};

export default IncomePage;
