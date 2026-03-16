import axios from "axios";

const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE_URL =
  rawApiBaseUrl.replace(/\/$/, "") || (import.meta.env.DEV ? "http://localhost:5000" : "");

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

export const authService = {
  signup: async (payload) => {
    const response = await api.post("/api/auth/signup", payload);
    return response.data;
  },
  login: async (payload) => {
    const response = await api.post("/api/auth/login", payload);
    return response.data;
  },
  googleTokenLogin: async (credential) => {
    const response = await api.post("/api/auth/google/token", { credential });
    return response.data;
  },
  listWorkspaces: async () => {
    const response = await api.get("/api/workspaces");
    return response.data;
  },
  createWorkspace: async (name) => {
    const response = await api.post("/api/workspaces", { name });
    return response.data;
  },
  getWorkspaceProfile: async (workspaceId) => {
    const response = await api.get("/api/workspaces/profile", { params: { workspaceId } });
    return response.data;
  },
  updateWorkspaceProfile: async (formData) => {
    const response = await api.patch("/api/workspaces/profile", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },
  listIncomeSources: async (params = {}) => {
    const response = await api.get("/api/income-sources", { params });
    return response.data;
  },
  createIncomeSource: async (payload) => {
    const response = await api.post("/api/income-sources", payload);
    return response.data;
  },
  listExpenseCategories: async (params = {}) => {
    const response = await api.get("/api/expense-categories", { params });
    return response.data;
  },
  createExpenseCategory: async (payload) => {
    const response = await api.post("/api/expense-categories", payload);
    return response.data;
  },
  listIncomes: async (params = {}) => {
    const response = await api.get("/api/incomes", { params });
    return response.data;
  },
  createIncome: async (payload) => {
    const response = await api.post("/api/incomes", payload);
    return response.data;
  },
  listExpenses: async (params = {}) => {
    const response = await api.get("/api/expenses", { params });
    return response.data;
  },
  createExpense: async (payload) => {
    const response = await api.post("/api/expenses", payload);
    return response.data;
  },
  runAgentCommand: async (payload) => {
    const response = await api.post("/api/agent/command", payload);
    return response.data;
  },
  getTelegramLinkStatus: async () => {
    const response = await api.get("/api/telegram-link/status");
    return response.data;
  },
  createTelegramLinkCode: async () => {
    const response = await api.post("/api/telegram-link/code");
    return response.data;
  },
  unlinkTelegram: async () => {
    const response = await api.post("/api/telegram-link/unlink");
    return response.data;
  },
  logout: async () => {
    try {
      const response = await api.post("/api/auth/logout");
      return response.data;
    } catch (_error) {
      const response = await api.get("/api/auth/logout");
      return response.data;
    }
  },
  getMe: async () => {
    const response = await api.get("/api/auth/me");
    return response.data;
  },
  getProtectedDashboard: async (params = {}) => {
    const response = await api.get("/api/protected/dashboard", { params });
    return response.data;
  },
  googleLoginUrl: `${API_BASE_URL}/api/auth/google`
};
