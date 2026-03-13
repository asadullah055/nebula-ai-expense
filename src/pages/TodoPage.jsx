import AppShell from "../components/AppShell";

const demoTodos = [
  { id: 1, title: "Review monthly income summary", status: "Pending" },
  { id: 2, title: "Add utility expenses", status: "In Progress" },
  { id: 3, title: "Sync Telegram commands", status: "Done" }
];

const TodoPage = () => {
  return (
    <AppShell activeKey="todo">
      <article className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Todo</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This is a demo todo page. Replace these with your real task data later.
        </p>

        <div className="mt-6 space-y-3">
          {demoTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{todo.title}</p>
              <span className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300">
                {todo.status}
              </span>
            </div>
          ))}
        </div>
      </article>
    </AppShell>
  );
};

export default TodoPage;
