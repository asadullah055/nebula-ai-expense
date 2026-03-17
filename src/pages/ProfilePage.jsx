import AppShell from "../components/AppShell";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";
import { useEffect, useRef, useState } from "react";

const ProfilePage = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [workspaceId, setWorkspaceId] = useState(() => localStorage.getItem("selectedWorkspaceId") || "");
  const [workspaceName, setWorkspaceName] = useState(() => localStorage.getItem("selectedWorkspace") || "");
  const [selectedProfile, setSelectedProfile] = useState(() => localStorage.getItem("selectedProfile") || "Company");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [monthlyExpenseLimit, setMonthlyExpenseLimit] = useState("0");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState({
    name: "",
    avatarUrl: "",
    companyDescription: "",
    monthlyExpenseLimit: "0"
  });

  const normalizeAvatarValue = (value) => {
    const trimmed = (value || "").trim();
    if (!trimmed) return "";
    if (/^(data:image\/|blob:)/i.test(trimmed)) return trimmed;
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  };

  const resolveWorkspaceProfile = (workspaceValue, userNameValue = "") => {
    const normalizedWorkspace = (workspaceValue || "").trim().toLowerCase();
    const normalizedUserName = (userNameValue || "").trim().toLowerCase();
    if (!normalizedWorkspace) return "Company";
    if (normalizedWorkspace.includes("personal")) return "Personal";
    if (normalizedUserName && normalizedWorkspace === normalizedUserName) return "Personal";
    return "Company";
  };

  const effectiveProfile =
    selectedProfile === "Personal" ? "Personal" : resolveWorkspaceProfile(workspaceName, user?.name || "");

  useEffect(() => {
    setEmail(user?.email || "");
  }, [user]);

  useEffect(() => {
    const handleWorkspaceChange = (event) => {
      const nextWorkspaceId = (event.detail?.workspaceId || localStorage.getItem("selectedWorkspaceId") || "").trim();
      const nextWorkspaceName = (event.detail?.workspaceName || localStorage.getItem("selectedWorkspace") || "").trim();
      const nextProfile = (event.detail?.profile || localStorage.getItem("selectedProfile") || "Company").trim();
      setWorkspaceId(nextWorkspaceId);
      setWorkspaceName(nextWorkspaceName);
      setSelectedProfile(nextProfile === "Personal" ? "Personal" : "Company");
      setSuccess("");
      setError("");
    };

    window.addEventListener("workspace:changed", handleWorkspaceChange);
    return () => window.removeEventListener("workspace:changed", handleWorkspaceChange);
  }, []);

  useEffect(() => {
    const loadWorkspaceProfile = async () => {
      if (!workspaceId) {
        setName("");
        setCompanyDescription("");
        setMonthlyExpenseLimit("0");
        setAvatarUrl("");
        setAvatarFile(null);
        setAvatarPreview("");
        setSelectedFileName("");
        return;
      }

      setIsLoadingProfile(true);
      setError("");

      try {
        const data = await authService.getWorkspaceProfile(workspaceId, effectiveProfile);
        const workspace = data.workspace || {};
        const nextName = (workspace.name || workspace.profileName || "").trim();
        const nextAvatar = (workspace.avatar || "").trim();
        const nextDescription = workspace.companyDescription || "";
        const nextMonthlyExpenseLimit = String(Number(workspace.monthlyExpenseLimit || 0));
        const nextWorkspaceName = (workspace.name || workspaceName || "").trim();

        setWorkspaceName(nextWorkspaceName);
        if (nextWorkspaceName) {
          localStorage.setItem("selectedWorkspace", nextWorkspaceName);
        }
        setName(nextName);
        setCompanyDescription(nextDescription);
        setMonthlyExpenseLimit(nextMonthlyExpenseLimit);
        setAvatarUrl(nextAvatar);
        setAvatarFile(null);
        setAvatarPreview("");
        setSelectedFileName("");
        setSavedSnapshot({
          name: nextName,
          avatarUrl: nextAvatar,
          companyDescription: nextDescription,
          monthlyExpenseLimit: nextMonthlyExpenseLimit
        });
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Failed to load workspace profile");
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadWorkspaceProfile();
  }, [workspaceId, effectiveProfile]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const normalizedWorkspaceAvatar = normalizeAvatarValue(avatarPreview || avatarUrl || "");
  const normalizedEmailAvatar = normalizeAvatarValue(user?.avatar || "");
  const isPersonalWorkspace = effectiveProfile === "Personal";
  const resolvedAvatar = normalizedWorkspaceAvatar || (isPersonalWorkspace ? normalizedEmailAvatar : "");

  const hasChanges =
    name.trim() !== savedSnapshot.name ||
    companyDescription.trim() !== savedSnapshot.companyDescription ||
    monthlyExpenseLimit.trim() !== savedSnapshot.monthlyExpenseLimit ||
    Boolean(avatarFile);

  const onPickAvatar = () => {
    fileInputRef.current?.click();
  };

  const onAvatarFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be under 5MB");
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    const nextPreview = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview(nextPreview);
    setSelectedFileName(file.name);
    setError("");
    setSuccess("");
  };

  const onSave = async (event) => {
    event.preventDefault();
    if (!hasChanges) return;
    if (!workspaceId) {
      setError("Please select a workspace first");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("workspaceId", workspaceId);
      formData.append("profile", effectiveProfile);
      formData.append("profileName", name.trim());
      formData.append("companyDescription", companyDescription.trim());
      formData.append("monthlyExpenseLimit", monthlyExpenseLimit.trim() || "0");
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const data = await authService.updateWorkspaceProfile(formData);
      const workspace = data.workspace || {};

      const nextName = (workspace.name || workspace.profileName || "").trim();
      const nextAvatar = (workspace.avatar || "").trim();
      const nextDescription = workspace.companyDescription || "";
      const nextMonthlyExpenseLimit = String(Number(workspace.monthlyExpenseLimit || 0));
      const nextWorkspaceName = (workspace.name || workspaceName || "").trim();

      setWorkspaceName(nextWorkspaceName);
      if (nextWorkspaceName) {
        localStorage.setItem("selectedWorkspace", nextWorkspaceName);
      }
      setName(nextName);
      setCompanyDescription(nextDescription);
      setMonthlyExpenseLimit(nextMonthlyExpenseLimit);
      setAvatarUrl(nextAvatar);
      setSavedSnapshot({
        name: nextName,
        avatarUrl: nextAvatar,
        companyDescription: nextDescription,
        monthlyExpenseLimit: nextMonthlyExpenseLimit
      });
      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview("");
      setSelectedFileName("");

      window.dispatchEvent(
        new CustomEvent("workspace:profile-updated", {
          detail: {
            workspace: {
              id: String(workspace.id || workspaceId),
              name: nextWorkspaceName,
              profileName: nextName,
              avatar: nextAvatar,
              companyDescription: nextDescription
            }
          }
        })
      );

      setSuccess("Workspace profile updated successfully");
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Failed to update workspace profile");
    } finally {
      setIsSaving(false);
    }
  };

  const fallbackLetter = (name || "U").trim().charAt(0).toUpperCase();

  return (
    <AppShell activeKey="profile">
      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-gradient-to-r from-sky-100 via-white to-emerald-100 px-6 py-7 dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Profile Settings</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage settings for the selected workspace.
          </p>
        </div>

        <form onSubmit={onSave} className="grid gap-6 p-6 lg:grid-cols-[300px_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Profile Photo</p>
            <div className="mt-4 flex flex-col items-center">
              <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border border-slate-200 bg-white text-3xl font-semibold text-[var(--brand)] dark:border-slate-700 dark:bg-slate-950">
                {resolvedAvatar ? (
                  <img src={resolvedAvatar} alt={name || "User"} className="h-full w-full object-cover" />
                ) : (
                  fallbackLetter
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onAvatarFileChange}
              />
              <button
                type="button"
                onClick={onPickAvatar}
                className="mt-4 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
              >
                {normalizedWorkspaceAvatar ? "Change Photo" : "Add Photo"}
              </button>
              <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                JPG, PNG, WEBP. Max 5MB.
              </p>
              {selectedFileName && (
                <p className="mt-1 max-w-full truncate text-xs text-slate-500 dark:text-slate-400">
                  Selected: {selectedFileName}
                </p>
              )}
            </div>
          </section>

          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-950">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200">Workspace</label>
              <input
                type="text"
                value={workspaceName || "-"}
                readOnly
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              />
            </div>

            <div>
              <label htmlFor="profileName" className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200">
                Workspace Name
              </label>
              <input
                id="profileName"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                  setSuccess("");
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="monthlyExpenseLimit"
                className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                Monthly Expense Limit ({effectiveProfile})
              </label>
              <input
                id="monthlyExpenseLimit"
                type="number"
                min="0"
                step="0.01"
                value={monthlyExpenseLimit}
                onChange={(event) => {
                  setMonthlyExpenseLimit(event.target.value);
                  setError("");
                  setSuccess("");
                }}
                placeholder="Enter monthly expense limit"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="profileEmail" className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200">
                Email
              </label>
              <input
                id="profileEmail"
                type="email"
                value={email}
                readOnly
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="companyDescription"
                className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                {isPersonalWorkspace ? "Short Bio" : "Company Description"}
              </label>
              <textarea
                id="companyDescription"
                value={companyDescription}
                onChange={(event) => {
                  setCompanyDescription(event.target.value);
                  setError("");
                  setSuccess("");
                }}
                maxLength={500}
                rows={5}
                placeholder={
                  isPersonalWorkspace
                    ? "Write a short bio about yourself"
                    : "Write a short description about your company"
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">
                {companyDescription.length}/500
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">Provider: {user?.provider || "-"}</p>
              <button
                type="submit"
                disabled={!hasChanges || isSaving || isLoadingProfile}
                className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition enabled:hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
            {success && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                {success}
              </p>
            )}
          </section>
        </form>
      </article>
    </AppShell>
  );
};

export default ProfilePage;
