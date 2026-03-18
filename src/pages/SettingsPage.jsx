import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HiXMark } from "react-icons/hi2";
import { LuCopy, LuLink, LuRefreshCw, LuUnlink } from "react-icons/lu";
import { RiArrowRightUpLine } from "react-icons/ri";
import AppShell from "../components/AppShell";
import { authService } from "../services/authService";

const INCOME_TYPE_OPTIONS = ["Recurring Income", "Variable Income"];
const EXPENSE_TYPE_OPTIONS = ["Recurring Expense", "Variable Expense"];
const PROFILE_OPTIONS = ["Personal", "Company"];

const formatExpires = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch (_error) {
    return value;
  }
};

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("income");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    () => localStorage.getItem("selectedWorkspaceId") || ""
  );
  const [incomeSources, setIncomeSources] = useState([]);
  const [incomeLoading, setIncomeLoading] = useState(true);
  const [incomeFetchError, setIncomeFetchError] = useState("");
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [incomeType, setIncomeType] = useState("");
  const [incomeProfile, setIncomeProfile] = useState("Personal");
  const [incomeCategory, setIncomeCategory] = useState("");
  const [incomeError, setIncomeError] = useState("");
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [expenseLoading, setExpenseLoading] = useState(true);
  const [expenseFetchError, setExpenseFetchError] = useState("");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseType, setExpenseType] = useState("");
  const [expenseProfile, setExpenseProfile] = useState("Personal");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseError, setExpenseError] = useState("");

  const [status, setStatus] = useState({
    linked: false,
    chatId: null,
    pendingCode: null,
    pendingCodeExpiresAt: null,
    botUsername: ""
  });
  const [linkData, setLinkData] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [linkLoading, setLinkLoading] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [showCodePanel, setShowCodePanel] = useState(false);

  const loadStatus = async () => {
    setLoadingStatus(true);
    setError("");
    try {
      const data = await authService.getTelegramLinkStatus();
      setStatus(data);
    } catch (_error) {
      setError("Failed to load Telegram status");
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadIncomeSources = async () => {
    const workspaceId = (selectedWorkspaceId || "").trim();
    if (!workspaceId) {
      setIncomeSources([]);
      setIncomeFetchError("Please select a workspace first");
      setIncomeLoading(false);
      return;
    }

    setIncomeLoading(true);
    setIncomeFetchError("");
    try {
      const data = await authService.listIncomeSources({ workspaceId });
      setIncomeSources(data.incomeSources || []);
    } catch (_error) {
      setIncomeFetchError("Failed to load income sources");
    } finally {
      setIncomeLoading(false);
    }
  };

  const loadExpenseCategories = async () => {
    const workspaceId = (selectedWorkspaceId || "").trim();
    if (!workspaceId) {
      setExpenseCategories([]);
      setExpenseFetchError("Please select a workspace first");
      setExpenseLoading(false);
      return;
    }

    setExpenseLoading(true);
    setExpenseFetchError("");
    try {
      const data = await authService.listExpenseCategories({ workspaceId });
      setExpenseCategories(data.expenseCategories || []);
    } catch (_error) {
      setExpenseFetchError("Failed to load expense categories");
    } finally {
      setExpenseLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadIncomeSources();
    loadExpenseCategories();
  }, [selectedWorkspaceId]);

  useEffect(() => {
    const onWorkspaceChanged = (event) => {
      const workspaceId = event.detail?.workspaceId || localStorage.getItem("selectedWorkspaceId") || "";
      setSelectedWorkspaceId(workspaceId);
    };

    window.addEventListener("workspace:changed", onWorkspaceChanged);
    window.addEventListener("storage", onWorkspaceChanged);
    return () => {
      window.removeEventListener("workspace:changed", onWorkspaceChanged);
      window.removeEventListener("storage", onWorkspaceChanged);
    };
  }, []);

  useEffect(() => {
    const hasOpenModal = isIncomeModalOpen || isExpenseModalOpen;
    if (!hasOpenModal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isIncomeModalOpen, isExpenseModalOpen]);

  const onGenerateCode = async () => {
    setLinkLoading(true);
    setError("");
    setCopyMsg("");
    try {
      const data = await authService.createTelegramLinkCode();
      setLinkData(data);
      setShowCodePanel(true);
      await loadStatus();
    } catch (_error) {
      setError("Failed to generate link code");
    } finally {
      setLinkLoading(false);
    }
  };

  const onUnlink = async () => {
    setUnlinkLoading(true);
    setError("");
    setCopyMsg("");
    try {
      await authService.unlinkTelegram();
      setLinkData(null);
      setShowCodePanel(false);
      await loadStatus();
    } catch (_error) {
      setError("Failed to unlink Telegram");
    } finally {
      setUnlinkLoading(false);
    }
  };

  const code = linkData?.code || status.pendingCode || "";
  const expiresAt = linkData?.expiresAt || status.pendingCodeExpiresAt || "";
  const deepLink =
    linkData?.deepLink ||
    status.deepLink ||
    (status.botUsername && code
      ? `https://t.me/${status.botUsername}?start=link_${encodeURIComponent(code)}`
      : "");

  const copyText = async (value, label) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyMsg(`${label} copied`);
      setTimeout(() => setCopyMsg(""), 1600);
    } catch (_error) {
      setCopyMsg("Copy failed");
    }
  };

  const getSelectedProfile = () => {
    const selectedProfile = (localStorage.getItem("selectedProfile") || "").trim();
    return PROFILE_OPTIONS.includes(selectedProfile) ? selectedProfile : "Personal";
  };

  const openIncomeModal = () => {
    setIncomeType("Recurring Income");
    setIncomeProfile(getSelectedProfile());
    setIncomeCategory("");
    setIncomeError("");
    setIsIncomeModalOpen(true);
  };

  const closeIncomeModal = () => {
    setIsIncomeModalOpen(false);
  };

  const onAddIncomeSource = async (event) => {
    event.preventDefault();
    const normalizedCategory = incomeCategory.trim();
    const selectedIncomeProfile = incomeProfile || getSelectedProfile();
    const workspaceId = (selectedWorkspaceId || "").trim();

    if (!incomeType) {
      setIncomeError("Please select a type");
      return;
    }

    if (!workspaceId) {
      setIncomeError("Please select a workspace first");
      return;
    }

    if (!normalizedCategory) {
      setIncomeError("Please enter income category");
      return;
    }

    try {
      const data = await authService.createIncomeSource({
        workspaceId,
        name: normalizedCategory,
        type: incomeType,
        profile: selectedIncomeProfile
      });
      const created = data.incomeSource;
      setIncomeSources((prev) => [
        {
          _id: created.id,
          name: created.name,
          type: created.type,
          profile: created.profile,
          createdAt: created.createdAt
        },
        ...prev
      ]);
      closeIncomeModal();
    } catch (err) {
      setIncomeError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Failed to add income source");
    }
  };

  const openExpenseModal = () => {
    setExpenseType("Recurring Expense");
    setExpenseProfile(getSelectedProfile());
    setExpenseCategory("");
    setExpenseError("");
    setIsExpenseModalOpen(true);
  };

  const closeExpenseModal = () => {
    setIsExpenseModalOpen(false);
  };

  const onAddExpenseCategory = async (event) => {
    event.preventDefault();
    const normalizedCategory = expenseCategory.trim();
    const selectedExpenseProfile = expenseProfile || getSelectedProfile();
    const workspaceId = (selectedWorkspaceId || "").trim();

    if (!expenseType) {
      setExpenseError("Please select a type");
      return;
    }

    if (!workspaceId) {
      setExpenseError("Please select a workspace first");
      return;
    }

    if (!normalizedCategory) {
      setExpenseError("Please enter expense category");
      return;
    }

    try {
      const data = await authService.createExpenseCategory({
        workspaceId,
        name: normalizedCategory,
        type: expenseType,
        profile: selectedExpenseProfile
      });
      const created = data.expenseCategory;
      setExpenseCategories((prev) => [
        {
          _id: created.id,
          name: created.name,
          type: created.type,
          profile: created.profile,
          createdAt: created.createdAt
        },
        ...prev
      ]);
      closeExpenseModal();
    } catch (err) {
      setExpenseError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Failed to add expense category");
    }
  };

  return (
    <AppShell activeKey="settings">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="mb-6 flex flex-wrap gap-3">
          {["income", "expense", "telegram"].map((tab) => {
            const label = tab.charAt(0).toUpperCase() + tab.slice(1);
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-6 py-2.5 text-sm font-bold transition ${isActive
                    ? "bg-[var(--brand)] text-white ring-2 ring-white/75 ring-inset dark:ring-slate-200/80"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {activeTab === "income" && (
          <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Income Sources</h2>
              <button
                type="button"
                onClick={openIncomeModal}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/60 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30"
              >
                + Add Income Source
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {incomeLoading && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading income sources...</p>
              )}
              {!incomeLoading && !incomeSources.length && (
                <p className="text-sm text-slate-500 dark:text-slate-400">No income source found yet.</p>
              )}
              {!incomeLoading && incomeSources.map((source) => (
                <div
                  key={source._id || source.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-300">
                      <RiArrowRightUpLine size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-slate-900 dark:text-slate-100">{source.name}</p>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-4 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {source.type}
                  </span>
                </div>
              ))}
            </div>
            {incomeFetchError && (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                {incomeFetchError}
              </p>
            )}
          </article>
        )}

        {activeTab === "expense" && (
          <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Expense Categories</h2>
              <button
                type="button"
                onClick={openExpenseModal}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/60 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30"
              >
                + Add Expense Category
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {expenseLoading && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading expense categories...</p>
              )}
              {!expenseLoading && !expenseCategories.length && (
                <p className="text-sm text-slate-500 dark:text-slate-400">No expense category found yet.</p>
              )}
              {!expenseLoading && expenseCategories.map((category) => (
                <div
                  key={category._id || category.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-300">
                      <RiArrowRightUpLine size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-slate-900 dark:text-slate-100">{category.name}</p>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-4 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {category.type}
                  </span>
                </div>
              ))}
            </div>
            {expenseFetchError && (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                {expenseFetchError}
              </p>
            )}
          </article>
        )}

        {activeTab === "telegram" && (
          <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Telegram Integration</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Link your Telegram account to manage income and expense from chat.
                </p>
              </div>
              <button
                type="button"
                onClick={loadStatus}
                disabled={loadingStatus}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-70 dark:border-violet-700/60 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30"
              >
                <LuRefreshCw
                  size={17}
                  className={loadingStatus ? "animate-spin" : ""}
                  style={loadingStatus ? { animationDuration: "0.5s" } : undefined}
                />
                Refresh Status
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm text-slate-900 dark:text-slate-100">
                <span className="font-semibold">Status:</span> {loadingStatus ? "Checking..." : status.linked ? "Linked" : "Not linked"}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Chat ID: {status.chatId || "-"}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onGenerateCode}
                disabled={linkLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-70 dark:border-violet-700/60 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30"
              >
                <LuLink size={18} />
                Generate Link Code
              </button>

              <button
                type="button"
                onClick={onUnlink}
                disabled={unlinkLoading || !status.linked}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-800/70 dark:bg-rose-950/20 dark:text-rose-300 dark:hover:bg-rose-950/30"
              >
                <LuUnlink size={18} />
                Unlink Telegram
              </button>
            </div>

            {showCodePanel && code && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm text-slate-900 dark:text-slate-100">
                  Your link code: <span className="font-semibold">{code}</span>
                </p>
                {expiresAt && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Expires at: {formatExpires(expiresAt)}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => copyText(code, "Code")}
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/60 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30"
                  >
                    <LuCopy size={17} />
                    Copy Code
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(deepLink, "Deep link")}
                    disabled={!deepLink}
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-700/60 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30"
                  >
                    <LuCopy size={17} />
                    Copy Deep Link
                  </button>
                  {deepLink && (
                    <a
                      href={deepLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/60 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30"
                    >
                      Open Bot
                    </a>
                  )}
                </div>

                <p className="mt-4 text-xs text-slate-600 dark:text-slate-300">
                  Send <span className="font-semibold">/link {code}</span> to your Telegram bot.
                </p>
                {copyMsg && <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{copyMsg}</p>}
              </div>
            )}

            {error && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
          </article>
        )}
      </section>

        {isIncomeModalOpen &&
          createPortal(
            <div
              className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-black/50 px-4 py-4 backdrop-blur-[1px]"
              onClick={closeIncomeModal}
            >
          <div
            className="w-full max-w-2xl overflow-visible rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Add Income Source</h3>
              <button
                type="button"
                onClick={closeIncomeModal}
                className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <HiXMark size={24} />
              </button>
            </div>

            <form onSubmit={onAddIncomeSource} className="space-y-5 px-6 py-6">
              <label htmlFor="incomeType" className="block text-base font-semibold text-slate-800 dark:text-slate-200">
                Type
              </label>
              <div className="flex w-full max-w-md rounded-xl border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                {INCOME_TYPE_OPTIONS.map((typeName) => {
                  const isActive = incomeType === typeName;
                  return (
                    <button
                      key={typeName}
                      type="button"
                      onClick={() => {
                        setIncomeType(typeName);
                        if (incomeError) setIncomeError("");
                      }}
                      className={`flex-1 rounded-lg px-3 p-3 text-sm font-semibold transition ${
                        isActive
                          ? "bg-[var(--brand)] text-white ring-2 ring-white/75 ring-inset dark:ring-slate-200/80"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      {typeName}
                    </button>
                  );
                })}
              </div>

              <label htmlFor="incomeCategory" className="block text-base font-semibold text-slate-800 dark:text-slate-200">
                Income Category
              </label>
              <input
                id="incomeCategory"
                type="text"
                placeholder="Enter income category"
                value={incomeCategory}
                onChange={(event) => {
                  setIncomeCategory(event.target.value);
                  if (incomeError) setIncomeError("");
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />

              {incomeError && <p className="text-sm text-rose-600 dark:text-rose-400">{incomeError}</p>}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                >
                  Add Income Category
                </button>
              </div>
            </form>
          </div>
            </div>,
            document.body
          )}

        {isExpenseModalOpen &&
          createPortal(
            <div
              className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-black/50 px-4 py-4 backdrop-blur-[1px]"
              onClick={closeExpenseModal}
            >
          <div
            className="w-full max-w-2xl overflow-visible rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Add Expense Category</h3>
              <button
                type="button"
                onClick={closeExpenseModal}
                className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <HiXMark size={24} />
              </button>
            </div>

            <form onSubmit={onAddExpenseCategory} className="space-y-5 px-6 py-6">
              <label htmlFor="expenseType" className="block text-base font-semibold text-slate-800 dark:text-slate-200">
                Type
              </label>
              <div className="flex w-full max-w-md rounded-xl border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                {EXPENSE_TYPE_OPTIONS.map((typeName) => {
                  const isActive = expenseType === typeName;
                  return (
                    <button
                      key={typeName}
                      type="button"
                      onClick={() => {
                        setExpenseType(typeName);
                        if (expenseError) setExpenseError("");
                      }}
                      className={`flex-1 rounded-lg px-3 p-3 text-sm font-semibold transition ${
                        isActive
                          ? "bg-[var(--brand)] text-white ring-2 ring-white/75 ring-inset dark:ring-slate-200/80"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      {typeName}
                    </button>
                  );
                })}
              </div>

              <label htmlFor="expenseCategory" className="block text-base font-semibold text-slate-800 dark:text-slate-200">
                Expense Category
              </label>
              <input
                id="expenseCategory"
                type="text"
                placeholder="Enter expense category"
                value={expenseCategory}
                onChange={(event) => {
                  setExpenseCategory(event.target.value);
                  if (expenseError) setExpenseError("");
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />

              {expenseError && <p className="text-sm text-rose-600 dark:text-rose-400">{expenseError}</p>}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                >
                  Add Expense Category
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

export default SettingsPage;
