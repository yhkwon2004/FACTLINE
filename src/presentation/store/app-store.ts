import { create } from "zustand";
import { Case, User } from "../../domain/entities";

interface AppState {
  user: User | null;
  cases: Case[];
  currentCase: Case | null;
  isLoading: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  setCases: (cases: Case[]) => void;
  setCurrentCase: (caseData: Case | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  cases: [],
  currentCase: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),
  setCases: (cases) => set({ cases }),
  setCurrentCase: (currentCase) => set({ currentCase }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
