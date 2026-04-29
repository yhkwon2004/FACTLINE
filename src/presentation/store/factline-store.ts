"use client";

import { create } from "zustand";

interface FactlineState {
  activeCaseId: string | null;
  setActiveCaseId: (caseId: string | null) => void;
}

export const useFactlineStore = create<FactlineState>((set) => ({
  activeCaseId: null,
  setActiveCaseId: (activeCaseId) => set({ activeCaseId }),
}));

