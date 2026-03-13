import AppShell from "../components/AppShell";
import { useAuth } from "../hooks/useAuth";

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <AppShell activeKey="profile">
      <article className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Profile</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This is your profile page. You can show account details and profile settings here.
        </p>

        <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            <span className="font-semibold">Name:</span> {user?.name || "-"}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            <span className="font-semibold">Email:</span> {user?.email || "-"}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            <span className="font-semibold">Provider:</span> {user?.provider || "-"}
          </p>
        </div>
      </article>
    </AppShell>
  );
};

export default ProfilePage;
