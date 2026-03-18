import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineXMark } from "react-icons/hi2";
import AppShell from "../components/AppShell";
import { authService } from "../services/authService";

const deriveProfileFromWorkspace = (workspaceName) => {
  const text = (workspaceName || "").toLowerCase();
  if (text.includes("personal")) return "Personal";
  if (text.includes("company")) return "Company";
  return workspaceName ? "Company" : "";
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const TodoPage = () => {
  const [selectedWorkspace, setSelectedWorkspace] = useState(localStorage.getItem("selectedWorkspace") || "");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    localStorage.getItem("selectedWorkspaceId") || ""
  );
  const [selectedProfile, setSelectedProfile] = useState(localStorage.getItem("selectedProfile") || "");

  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [goalForm, setGoalForm] = useState({
    title: "",
    targetAmount: "",
    description: ""
  });
  const [taskForm, setTaskForm] = useState({
    name: "",
    amount: "",
    deadline: new Date().toISOString().slice(0, 10),
    description: ""
  });

  const [goalFormError, setGoalFormError] = useState("");
  const [taskFormError, setTaskFormError] = useState("");
  const [goalEntryFormError, setGoalEntryFormError] = useState("");
  const [goalSubmitting, setGoalSubmitting] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [goalEntrySubmitting, setGoalEntrySubmitting] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isGoalEntryModalOpen, setIsGoalEntryModalOpen] = useState(false);
  const [goalEntryForm, setGoalEntryForm] = useState({
    goalId: "",
    name: "",
    amount: "",
    description: ""
  });

  const effectiveProfile = useMemo(
    () => selectedProfile || deriveProfileFromWorkspace(selectedWorkspace) || "",
    [selectedProfile, selectedWorkspace]
  );

  const pendingTasks = useMemo(() => tasks.filter((task) => task.status === "Pending"), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === "Completed"), [tasks]);

  useEffect(() => {
    const onWorkspaceChanged = (event) => {
      const workspaceId = event.detail?.workspaceId || localStorage.getItem("selectedWorkspaceId") || "";
      const workspaceName = event.detail?.workspaceName || localStorage.getItem("selectedWorkspace") || "";
      const profile =
        event.detail?.profile || localStorage.getItem("selectedProfile") || deriveProfileFromWorkspace(workspaceName);

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
    const loadTodoData = async () => {
      const workspaceId = (selectedWorkspaceId || "").trim();
      if (!workspaceId) {
        setGoals([]);
        setTasks([]);
        setError("Please select a workspace first.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const [goalsRes, tasksRes] = await Promise.all([
          authService.listBudgetGoals({
            workspaceId,
            ...(effectiveProfile ? { profile: effectiveProfile } : {})
          }),
          authService.listFinanceTasks({
            workspaceId,
            ...(effectiveProfile ? { profile: effectiveProfile } : {})
          })
        ]);
        setGoals(goalsRes.goals || []);
        setTasks(tasksRes.tasks || []);
      } catch (_error) {
        setError("Failed to load todo data.");
      } finally {
        setLoading(false);
      }
    };

    loadTodoData();
  }, [selectedWorkspaceId, effectiveProfile]);

  const createGoal = async (event) => {
    event.preventDefault();
    setGoalFormError("");
    const workspaceId = (selectedWorkspaceId || "").trim();
    if (!workspaceId) {
      setGoalFormError("Please select a workspace first.");
      return;
    }
    if (!goalForm.title.trim()) {
      setGoalFormError("Goal title is required.");
      return;
    }
    if (!goalForm.targetAmount || Number(goalForm.targetAmount) <= 0) {
      setGoalFormError("Target amount must be greater than 0.");
      return;
    }
    if (!goalForm.description.trim()) {
      setGoalFormError("Description is required.");
      return;
    }

    setGoalSubmitting(true);
    try {
      const profile = effectiveProfile || "Company";
      const response = await authService.createBudgetGoal({
        workspaceId,
        profile,
        title: goalForm.title.trim(),
        targetAmount: Number(goalForm.targetAmount),
        description: goalForm.description.trim()
      });

      setGoals((prev) => [response.goal, ...prev]);
      setGoalForm({
        title: "",
        targetAmount: "",
        description: ""
      });
      setIsGoalModalOpen(false);
    } catch (err) {
      setGoalFormError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Failed to create goal.");
    } finally {
      setGoalSubmitting(false);
    }
  };

  const createTask = async (event) => {
    event.preventDefault();
    setTaskFormError("");
    const workspaceId = (selectedWorkspaceId || "").trim();
    if (!workspaceId) {
      setTaskFormError("Please select a workspace first.");
      return;
    }
    if (!taskForm.description.trim()) {
      setTaskFormError("Description is required.");
      return;
    }
    if (!taskForm.name.trim()) {
      setTaskFormError("Name is required.");
      return;
    }
    if (!taskForm.amount || Number(taskForm.amount) <= 0) {
      setTaskFormError("Amount must be greater than 0.");
      return;
    }
    if (!taskForm.deadline) {
      setTaskFormError("Deadline is required.");
      return;
    }

    setTaskSubmitting(true);
    try {
      const profile = effectiveProfile || "Company";
      const response = await authService.createFinanceTask({
        workspaceId,
        profile,
        taskType: "Bill Payment",
        name: taskForm.name.trim(),
        amount: Number(taskForm.amount),
        deadline: taskForm.deadline,
        description: taskForm.description.trim()
      });
      setTasks((prev) =>
        [...prev, response.task].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      );
      setTaskForm({
        name: "",
        amount: "",
        deadline: new Date().toISOString().slice(0, 10),
        description: ""
      });
    } catch (err) {
      setTaskFormError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Failed to create task.");
    } finally {
      setTaskSubmitting(false);
    }
  };

  const toggleTaskStatus = async (task) => {
    const nextStatus = task.status === "Completed" ? "Pending" : "Completed";
    try {
      const response = await authService.updateFinanceTaskStatus(task.id, { status: nextStatus });
      setTasks((prev) => prev.map((item) => (item.id === response.task.id ? response.task : item)));
    } catch (_error) {
      setError("Failed to update task status.");
    }
  };

  const openGoalModal = () => {
    setGoalFormError("");
    setIsGoalModalOpen(true);
  };

  const closeGoalModal = () => {
    if (goalSubmitting) return;
    setIsGoalModalOpen(false);
  };

  const openGoalEntryModal = (goalId) => {
    setGoalEntryFormError("");
    setGoalEntryForm({
      goalId,
      name: "",
      amount: "",
      description: ""
    });
    setIsGoalEntryModalOpen(true);
  };

  const closeGoalEntryModal = () => {
    if (goalEntrySubmitting) return;
    setIsGoalEntryModalOpen(false);
  };

  const createGoalEntry = async (event) => {
    event.preventDefault();
    setGoalEntryFormError("");

    if (!goalEntryForm.goalId) {
      setGoalEntryFormError("Goal is required.");
      return;
    }
    if (!goalEntryForm.name.trim()) {
      setGoalEntryFormError("Name is required.");
      return;
    }
    if (!goalEntryForm.amount || Number(goalEntryForm.amount) <= 0) {
      setGoalEntryFormError("Amount must be greater than 0.");
      return;
    }

    const selectedGoal = goals.find((goal) => goal.id === goalEntryForm.goalId);
    if (!selectedGoal) {
      setGoalEntryFormError("Goal not found.");
      return;
    }

    setGoalEntrySubmitting(true);
    try {
      const entryType = selectedGoal.goalType === "Spending Goal" ? "expense" : "income";
      const response = await authService.addBudgetGoalEntry(goalEntryForm.goalId, {
        name: goalEntryForm.name.trim(),
        amount: Number(goalEntryForm.amount),
        description: goalEntryForm.description.trim(),
        entryType
      });

      setGoals((prev) => prev.map((goal) => (goal.id === response.goal.id ? response.goal : goal)));
      setGoalEntryForm({
        goalId: "",
        name: "",
        amount: "",
        description: ""
      });
      setIsGoalEntryModalOpen(false);
    } catch (err) {
      setGoalEntryFormError(
        err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Failed to add goal entry."
      );
    } finally {
      setGoalEntrySubmitting(false);
    }
  };

  useEffect(() => {
    if (!isGoalModalOpen && !isGoalEntryModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isGoalModalOpen, isGoalEntryModalOpen]);

  return (
    <AppShell activeKey="todo">
      <article className="rounded-3xl border border-sky-200 bg-sky-50 p-6 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Budget Goals and Deadline Tasks</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Create savings or spending goals, add income/expense progress, and track bill or income tasks with deadlines.
        </p>
      </article>

      <section className="grid grid-cols-1 gap-4">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create Budget Goal</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Personal goal setup: add name, target amount, and short description.
          </p>
          <button
            type="button"
            onClick={openGoalModal}
            className="mt-4 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
          >
            Create Goal
          </button>
        </article>
      </section>

      <article className="rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-slate-800 dark:bg-slate-950">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Goal Progress</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Track each goal's progress and recent added entries.
        </p>
        {loading && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading goals...</p>}
        {!loading && !goals.length && (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No goal created yet.</p>
        )}
        {!loading && goals.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{goal.title}</p>
                  <button
                    type="button"
                    onClick={() => openGoalEntryModal(goal.id)}
                    className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                  >
                    Add Entry
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Progress: {formatCurrency(goal.metrics.trackedAmount)} / {formatCurrency(goal.targetAmount)}
                </p>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-[var(--brand)] transition-all"
                    style={{ width: `${Math.min(100, Number(goal.metrics.progressPercent || 0))}%` }}
                  />
                </div>
                <div className="mt-3 space-y-1">
                  {(goal.contributions || []).length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No entry added yet.</p>
                  )}
                  {(goal.contributions || []).slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                    >
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {entry.name || "Entry"} - {formatCurrency(entry.amount)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{formatDate(entry.entryDate)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create Bill Payment Task</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Add bill name, amount, payment date, and description.
          </p>
          <form onSubmit={createTask} className="mt-4 space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Name</p>
              <input
                type="text"
                value={taskForm.name}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Name"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Amount</p>
              <input
                type="number"
                min="0"
                step="0.01"
                value={taskForm.amount}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, amount: event.target.value }))}
                placeholder="Amount"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Payment Date</p>
              <input
                type="date"
                value={taskForm.deadline}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, deadline: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Description</p>
              <textarea
                value={taskForm.description}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Description"
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            {taskFormError && <p className="text-sm text-rose-600 dark:text-rose-400">{taskFormError}</p>}
            <button
              type="submit"
              disabled={taskSubmitting}
              className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-70"
            >
              {taskSubmitting ? "Saving..." : "Create Task"}
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Deadline Tasks</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            View pending/completed tasks and days left before each deadline.
          </p>
          {loading && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading tasks...</p>}
          {!loading && !tasks.length && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No task created yet.</p>
          )}
          {!loading && tasks.length > 0 && (
            <div className="mt-4 space-y-3">
              {[...pendingTasks, ...completedTasks].map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{task.name || task.description}</p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        task.status === "Completed"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  {task.description && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{task.description}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {task.taskType} | {formatCurrency(task.amount)} | Deadline: {formatDate(task.deadline)}
                    {task.daysLeft >= 0 ? ` | ${task.daysLeft} day(s) left` : " | overdue"}
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleTaskStatus(task)}
                    className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Mark as {task.status === "Completed" ? "Pending" : "Completed"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}

      {isGoalEntryModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[210] grid place-items-center overflow-y-auto bg-black/50 px-4 py-4 backdrop-blur-[1px]"
            onClick={closeGoalEntryModal}
          >
            <div
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Add Goal Entry</h3>
                <button
                  type="button"
                  onClick={closeGoalEntryModal}
                  className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <HiOutlineXMark size={22} />
                </button>
              </div>

              <form onSubmit={createGoalEntry} className="space-y-3.5 px-4 py-4">
                <input
                  type="text"
                  value={goalEntryForm.name}
                  onChange={(event) => setGoalEntryForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Name"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-[var(--brand)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={goalEntryForm.amount}
                  onChange={(event) => setGoalEntryForm((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder="Amount"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-[var(--brand)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <textarea
                  value={goalEntryForm.description}
                  onChange={(event) => setGoalEntryForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Description"
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-[var(--brand)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                {goalEntryFormError && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                    {goalEntryFormError}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={goalEntrySubmitting}
                    className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-70"
                  >
                    {goalEntrySubmitting ? "Saving..." : "Add Entry"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {isGoalModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-black/50 px-4 py-4 backdrop-blur-[1px]"
            onClick={closeGoalModal}
          >
            <div
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Create Budget Goal</h3>
                <button
                  type="button"
                  onClick={closeGoalModal}
                  className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <HiOutlineXMark size={22} />
                </button>
              </div>

              <form onSubmit={createGoal} className="space-y-3.5 px-4 py-4">
                <input
                  type="text"
                  value={goalForm.title}
                  onChange={(event) => setGoalForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Goal name"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-[var(--brand)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={goalForm.targetAmount}
                  onChange={(event) => setGoalForm((prev) => ({ ...prev, targetAmount: event.target.value }))}
                  placeholder="Amount"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-[var(--brand)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <textarea
                  value={goalForm.description}
                  onChange={(event) => setGoalForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Description"
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-[var(--brand)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                {goalFormError && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                    {goalFormError}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={goalSubmitting}
                    className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-70"
                  >
                    {goalSubmitting ? "Saving..." : "Create Goal"}
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

export default TodoPage;
