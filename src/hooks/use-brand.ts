"use client";

import { create } from "zustand";

interface BrandState {
  activeBrandId: string | null;
  setActiveBrand: (brandId: string) => void;
}

export const useBrandStore = create<BrandState>((set) => ({
  activeBrandId: null,
  setActiveBrand: (brandId) => set({ activeBrandId: brandId }),
}));
