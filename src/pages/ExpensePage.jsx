import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { HiChevronDown, HiOutlineXMark } from "react-icons/hi2";
import { LuDownload, LuPlus, LuTrendingDown } from "react-icons/lu";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AppShell from "../components/AppShell";
import { authService } from "../services/authService";

const EXPENSE_TYPE_OPTIONS = ["Recurring Expense", "Variable Expense"];

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

const formatExpenseChartDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${ordinal(date.getDate())} ${month}`;
};

const formatExpenseListDate = (value) => {
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

const ExpensePage = () => {
  const [selectedWorkspace, setSelectedWorkspace] = useState(localStorage.getItem("selectedWorkspace") || "");
  const [selectedProfile, setSelectedProfile] = useState(
    localStorage.getItem("selectedProfile") ||
      deriveProfileFromWorkspace(localStorage.getItem("selectedWorkspace") || "")
  );
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState({
    expenseCategoryId: "",
    expenseType: "",
    amount: "",
    entryDate: new Date().toISOString().slice(0, 10)
  });
  const [isExpenseTypeMenuOpen, setIsExpenseTypeMenuOpen] = useState(false);
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

  const filteredCategories = useMemo(() => {
    const byProfile = effectiveProfile
      ? expenseCategories.filter((category) => category.profile === effectiveProfile)
      : expenseCategories;

    if (!form.expenseType) return [];
    return byProfile.filter((category) => category.type === form.expenseType);
  }, [expenseCategories, effectiveProfile, form.expenseType]);

  useEffect(() => {
    if (!isAddModalOpen) return;
    if (!form.expenseCategoryId) return;
    if (filteredCategories.find((category) => category._id === form.expenseCategoryId)) return;
    setForm((prev) => ({ ...prev, expenseCategoryId: "" }));
  }, [filteredCategories, form.expenseCategoryId, isAddModalOpen]);

  useEffect(() => {
    const onWorkspaceChanged = (event) => {
      const workspaceName = event.detail?.workspaceName || localStorage.getItem("selectedWorkspace") || "";
      const profile =
        event.detail?.profile ||
        localStorage.getItem("selectedProfile") ||
        deriveProfileFromWorkspace(workspaceName);
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
    const loadExpenseData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [categoriesRes, expensesRes] = await Promise.all([
          authService.listExpenseCategories({
            ...(effectiveProfile ? { profile: effectiveProfile } : {})
          }),
          authService.listExpenses({
            workspace: selectedWorkspace,
            ...(effectiveProfile ? { profile: effectiveProfile } : {})
          })
        ]);
        setExpenseCategories(categoriesRes.expenseCategories || []);
        setExpenses(expensesRes.entries || []);
      } catch (_error) {
        setError("Failed to load expense data");
      } finally {
        setIsLoading(false);
      }
    };

    loadExpenseData();
  }, [selectedWorkspace, effectiveProfile]);

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
    setIsExpenseTypeMenuOpen(false);
    setForm({
      expenseCategoryId: "",
      expenseType: "",
      amount: "",
      entryDate: new Date().toISOString().slice(0, 10)
    });
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsExpenseTypeMenuOpen(false);
    setIsAddModalOpen(false);
  };

  const onSubmitExpense = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.expenseType) {
      setFormError("Please select expense type");
      return;
    }
    if (!form.expenseCategoryId) {
      setFormError("Please select expense category");
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
      const profile = effectiveProfile || "Personal";
      const workspaceName = selectedWorkspace || profile;
      const response = await authService.createExpense({
        workspaceName,
        profile,
        expenseCategoryId: form.expenseCategoryId,
        expenseType: form.expenseType,
        amount: Number(form.amount),
        entryDate: form.entryDate
      });

      const created = response.entry;
      setExpenses((prev) => [
        {
          _id: created.id,
          category: created.category,
          expenseType: created.expenseType,
          amount: created.amount,
          profile: created.profile,
          workspaceName: created.workspaceName,
          entryDate: created.entryDate
        },
        ...prev
      ]);
      closeAddModal();
    } catch (err) {
      setFormError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Failed to add expense");
    } finally {
      setFormLoading(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    if (!rangeMeta.start || !rangeMeta.endExclusive) {
      return expenses;
    }

    const startTime = rangeMeta.start.getTime();
    const endTime = rangeMeta.endExclusive.getTime();
    return expenses.filter((item) => {
      const entryTime = new Date(item.entryDate).getTime();
      return entryTime >= startTime && entryTime < endTime;
    });
  }, [expenses, rangeMeta.start, rangeMeta.endExclusive]);

  const recurringExpenses = useMemo(
    () => filteredExpenses.filter((item) => item.expenseType === "Recurring Expense"),
    [filteredExpenses]
  );
  const variableExpenses = useMemo(
    () => filteredExpenses.filter((item) => item.expenseType === "Variable Expense"),
    [filteredExpenses]
  );

  const recurringTotal = recurringExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const variableTotal = variableExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expenseChartRows = useMemo(() => {
    const sorted = [...filteredExpenses].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    return sorted.slice(-8).map((item, index) => ({
      id: `${item._id}-${index}`,
      amount: Number(item.amount || 0),
      name: item.category || "Expense",
      dateLabel: formatExpenseChartDate(item.entryDate)
    }));
  }, [filteredExpenses]);

  const chartBarColors = useMemo(
    () => expenseChartRows.map((_, index) => (index % 2 === 0 ? "#6D4ED4" : "#B7A6E3")),
    [expenseChartRows]
  );

  const chartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <p className="font-semibold text-rose-600 dark:text-rose-300">{row?.name || "Expense"}</p>
        <p className="text-slate-600 dark:text-slate-300">
          Amount: <span className="font-semibold text-slate-900 dark:text-slate-100">-${Number(row?.amount || 0).toFixed(0)}</span>
        </p>
      </div>
    );
  };

  return (
    <AppShell activeKey="expense">
      <article className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Expense Overview</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Track your expenses over time and analyze your spending trends.
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
            Add Expense
          </button>
        </div>
      </article>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recurring Expense</p>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
              {recurringExpenses.length} items
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">${recurringTotal.toFixed(2)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Fixed monthly obligations</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Variable Expense</p>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              {variableExpenses.length} items
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">${variableTotal.toFixed(2)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Daily and one-time spending</p>
        </article>
      </section>

      <article className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Filter Expenses</p>
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
                    ? "bg-[var(--brand)] text-white"
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
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Last 30 Days Expense</h3>
          <div className="mt-4 h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseChartRows} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 12, fill: "#475569" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#475569" }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.18)" }} content={chartTooltip} />
                <Bar dataKey="amount" radius={[12, 12, 0, 0]}>
                  {expenseChartRows.map((row, index) => (
                    <Cell key={row.id} fill={chartBarColors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Expense Entries</h3>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LuDownload size={15} />
              Download
            </button>
          </div>

          {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>}

          {!isLoading && filteredExpenses.length > 0 && (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {filteredExpenses.slice(0, 12).map((item) => (
                <div
                  key={item._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold ${
                        item.expenseType === "Variable Expense"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                      }`}
                    >
                      {item.expenseType === "Variable Expense" ? "VE" : "RE"}
                    </span>
                    <div>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{item.category}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatExpenseListDate(item.entryDate)}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600 dark:bg-rose-900/20 dark:text-rose-300">
                    -${Number(item.amount).toFixed(0)}
                    <LuTrendingDown size={16} />
                  </span>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !filteredExpenses.length && (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No expense entries found for this selected date range.</p>
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
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Add Expense</h3>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <HiOutlineXMark size={22} />
                </button>
              </div>

              <form onSubmit={onSubmitExpense} className="space-y-3.5 px-4 py-4">
                <label className="block text-base font-semibold text-slate-800 dark:text-slate-200">Expense Type</label>
                <div className="flex w-full rounded-xl border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                  {EXPENSE_TYPE_OPTIONS.map((item) => {
                    const isActive = form.expenseType === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          const nextCategories = (effectiveProfile
                            ? expenseCategories.filter((category) => category.profile === effectiveProfile)
                            : expenseCategories
                          ).filter((category) => category.type === item);

                          setForm((prev) => ({
                            ...prev,
                            expenseType: item,
                            expenseCategoryId:
                              nextCategories.find((category) => category._id === prev.expenseCategoryId)?._id || ""
                          }));
                          setIsExpenseTypeMenuOpen(false);
                        }}
                        className={`flex-1 rounded-lg px-3 py-3 text-sm font-semibold transition ${
                          isActive
                            ? "bg-[var(--brand)] text-white"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                <label htmlFor="expenseCategoryId" className="block text-base font-semibold text-slate-800 dark:text-slate-200">
                  Expense Category
                </label>
                <div className="relative">
                  <button
                    id="expenseCategoryId"
                    type="button"
                    onClick={() => setIsExpenseTypeMenuOpen((prev) => !prev)}
                    disabled={!form.expenseType}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-base text-slate-900 outline-none transition focus:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <span>
                      {filteredCategories.find((category) => category._id === form.expenseCategoryId)?.name || "Select Expense Category"}
                    </span>
                    <HiChevronDown className={`transition ${isExpenseTypeMenuOpen ? "rotate-180" : ""}`} size={18} />
                  </button>

                  {isExpenseTypeMenuOpen && (
                    <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      {filteredCategories.map((category) => (
                        <button
                          key={category._id}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, expenseCategoryId: category._id }));
                            setIsExpenseTypeMenuOpen(false);
                          }}
                          className="w-full px-3 py-2.5 text-left text-base text-slate-900 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                          {category.name}
                        </button>
                      ))}
                      {!filteredCategories.length && (
                        <p className="px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400">
                          No category found for selected expense type.
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
                    {formLoading ? "Saving..." : "Add Expense"}
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

export default ExpensePage;
