import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiChevronDown, HiPlus, HiXMark } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import ThemeSelector from "./ThemeSelector";
import { SIDEBAR_NAV_ITEMS } from "../config/sidebarNav";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";

const AppShell = ({ activeKey, children }) => {
  const navigate = useNavigate();
  const { user, setUser, clearAuth } = useAuth();
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    () => localStorage.getItem("selectedWorkspace") || ""
  );
  const [selectedProfile, setSelectedProfile] = useState(
    () => localStorage.getItem("selectedProfile") || ""
  );
  const [isCompanyMenuOpen, setIsCompanyMenuOpen] = useState(false);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [companyError, setCompanyError] = useState("");
  const companyMenuRef = useRef(null);

  const resolveWorkspaceProfile = (workspaceName, userName = "") => {
    const normalizedWorkspace = (workspaceName || "").trim().toLowerCase();
    const normalizedUserName = (userName || "").trim().toLowerCase();

    if (!normalizedWorkspace) return "";
    if (normalizedWorkspace.includes("personal")) return "Personal";
    if (normalizedUserName && normalizedWorkspace === normalizedUserName) return "Personal";
    return "Company";
  };

  const updateSelectedWorkspace = (workspaceName, explicitProfile = "") => {
    if (!workspaceName) return;
    const nextProfile = explicitProfile || resolveWorkspaceProfile(workspaceName, user?.name || "");

    const savedWorkspace = localStorage.getItem("selectedWorkspace") || "";
    const savedProfile = localStorage.getItem("selectedProfile") || "";
    if (
      savedWorkspace === workspaceName &&
      savedProfile === nextProfile &&
      selectedCompany === workspaceName &&
      selectedProfile === nextProfile
    ) {
      return;
    }

    setSelectedCompany(workspaceName);
    setSelectedProfile(nextProfile);
    localStorage.setItem("selectedWorkspace", workspaceName);
    localStorage.setItem("selectedProfile", nextProfile);
    window.dispatchEvent(
      new CustomEvent("workspace:changed", { detail: { workspaceName, profile: nextProfile } })
    );
  };

  useEffect(() => {
    const syncProfile = async () => {
      try {
        const data = await authService.getMe();
        setUser(data.user);
      } catch (_error) {
        // Ignore: protected route handles invalid session.
      }
    };

    syncProfile();
  }, [setUser]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.avatar]);

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const data = await authService.listWorkspaces();
        const names = (data.workspaces || []).map((workspace) => workspace.name);

        if (names.length === 0) {
          const initialName = user?.name || "My Workspace";
          const created = await authService.createWorkspace(initialName);
          const createdName = created.workspace?.name || initialName;
          setCompanies([createdName]);
          updateSelectedWorkspace(createdName);
          return;
        }

        setCompanies(names);
        const saved = localStorage.getItem("selectedWorkspace");
        const nextSelection = saved && names.includes(saved) ? saved : names[0];
        updateSelectedWorkspace(nextSelection);
      } catch (_error) {
        // Keep UI usable even if workspace API fails.
        const fallback = user?.name || "My Workspace";
        setCompanies([fallback]);
        updateSelectedWorkspace(fallback);
      }
    };

    loadWorkspaces();
  }, [user?.name]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (companyMenuRef.current && !companyMenuRef.current.contains(event.target)) {
        setIsCompanyMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isAddCompanyOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAddCompanyOpen]);

  const onLogout = async () => {
    await authService.logout();
    clearAuth();
    navigate("/login", { replace: true });
  };

  const handleNavClick = async (item) => {
    if (item.action === "logout") {
      await onLogout();
      return;
    }

    if (item.path) {
      navigate(item.path);
    }
  };

  const normalizeAvatarUrl = (value) => {
    if (!value) return "";
    const trimmed = value.trim();
    let withProtocol = trimmed;
    if (trimmed.startsWith("//")) {
      withProtocol = `https:${trimmed}`;
    } else if (!/^https?:\/\//i.test(trimmed)) {
      withProtocol = `https://${trimmed}`;
    }

    if (withProtocol.includes("googleusercontent.com") && !withProtocol.includes("=s")) {
      return `${withProtocol}=s240-c`;
    }

    return withProtocol;
  };

  const avatarUrl = normalizeAvatarUrl(user?.avatar || "");
  const showAvatarImage = Boolean(avatarUrl) && !avatarLoadFailed;
  const workspaceLabel = selectedCompany || user?.name || "My Workspace";
  const effectiveProfile = selectedProfile || resolveWorkspaceProfile(workspaceLabel, user?.name || "");
  const isPersonalWorkspace = effectiveProfile !== "Company";
  const shouldShowAvatarImage = showAvatarImage && isPersonalWorkspace;
  const fallbackLabel = isPersonalWorkspace ? user?.name || workspaceLabel || "User" : workspaceLabel || "User";
  const avatarLetter = fallbackLabel.trim().charAt(0).toUpperCase();
  const workspaceSubLabel = isPersonalWorkspace ? user?.name || "User" : "Company Workspace";

  const openAddCompanyModal = () => {
    setNewCompanyName("");
    setCompanyError("");
    setIsCompanyMenuOpen(false);
    setIsAddCompanyOpen(true);
  };

  const submitNewCompany = async (event) => {
    event.preventDefault();
    const trimmedName = newCompanyName.trim();

    if (!trimmedName) {
      setCompanyError("Company name is required");
      return;
    }

    const exists = companies.some((company) => company.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      setCompanyError("Company already exists");
      return;
    }

    try {
      const data = await authService.createWorkspace(trimmedName);
      const createdName = data.workspace?.name || trimmedName;
      const updatedCompanies = [...companies, createdName];
      setCompanies(updatedCompanies);
      updateSelectedWorkspace(createdName);
      setIsAddCompanyOpen(false);
    } catch (error) {
      setCompanyError(error.response?.data?.message || "Failed to create company");
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          <img src="/tmpcrdu8so0.webp" alt="Nebula Nexus" className="h-9 w-9 rounded-lg object-cover" />
          Nebula AI Expense Manager
        </h1>
        <div className="relative ml-2 hidden sm:block" ref={companyMenuRef}>
          <button
            type="button"
            onClick={() => setIsCompanyMenuOpen((prev) => !prev)}
            className="flex min-w-[240px] items-center justify-between rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <span>{selectedCompany || user?.name || "My Workspace"}</span>
            <HiChevronDown className={`transition ${isCompanyMenuOpen ? "rotate-180" : ""}`} size={18} />
          </button>

          {isCompanyMenuOpen && (
            <div className="absolute left-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="max-h-56 overflow-y-auto py-1">
                {companies.map((company) => (
                  <button
                    key={company}
                    type="button"
                    onClick={() => {
                      updateSelectedWorkspace(company);
                      setIsCompanyMenuOpen(false);
                    }}
                    className={`flex w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      selectedCompany === company
                        ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {company}
                  </button>
                ))}
              </div>
              <div className="mt-1 border-t border-slate-200 pt-2 dark:border-slate-700">
                <button
                  type="button"
                  onClick={openAddCompanyModal}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--brand)] transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <HiPlus size={18} />
                  Add Company
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="ml-auto">
          <ThemeSelector />
        </div>
      </header>

      <section className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="mb-8 flex flex-col items-center justify-center rounded-xl px-3 py-2">
            <div className="mb-3 grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-2xl font-semibold text-[var(--brand)] dark:border-slate-700 dark:bg-slate-800">
              {shouldShowAvatarImage ? (
                <img
                  src={avatarUrl}
                  alt={user?.name || "User"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                avatarLetter
              )}
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{workspaceLabel}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{workspaceSubLabel}</p>
          </div>

          <nav className="space-y-2">
            {SIDEBAR_NAV_ITEMS.map((item) => {
              const isActive = item.key === activeKey;
              const Icon = item.Icon;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavClick(item)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-base transition ${
                    isActive
                      ? "bg-[var(--brand)] text-white"
                      : "text-slate-900 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="space-y-4 p-4 sm:p-6">{children}</section>
      </section>

      {isAddCompanyOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-black/50 px-4 py-4 backdrop-blur-[1px]"
            onClick={() => setIsAddCompanyOpen(false)}
          >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Add Company</h3>
              <button
                type="button"
                onClick={() => setIsAddCompanyOpen(false)}
                className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <HiXMark size={24} />
              </button>
            </div>

            <form onSubmit={submitNewCompany} className="space-y-5 px-6 py-6">
              <label htmlFor="companyName" className="block text-base font-medium text-slate-800 dark:text-slate-200">
                Company name
              </label>
              <input
                id="companyName"
                type="text"
                placeholder="Enter company name"
                value={newCompanyName}
                onChange={(event) => {
                  setNewCompanyName(event.target.value);
                  if (companyError) setCompanyError("");
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />

              {companyError && <p className="text-sm text-rose-600 dark:text-rose-400">{companyError}</p>}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                >
                  Add Workspace
                </button>
              </div>
            </form>
          </div>
          </div>,
          document.body
        )}
    </main>
  );
};

export default AppShell;
