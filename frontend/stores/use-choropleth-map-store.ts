import { create } from 'zustand';

export type ChoroplethMapTab = 'by-disease' | 'by-cluster' | 'by-anomaly';

interface ChoroplethMapState {
  activeTab: ChoroplethMapTab;
  setActiveTab: (tab: ChoroplethMapTab) => void;
  reset: () => void;
}

const useChoroplethMapStore = create<ChoroplethMapState>()((set) => ({
  activeTab: 'by-disease',
  setActiveTab: (tab) => set({ activeTab: tab }),
  reset: () => set({ activeTab: 'by-disease' }),
}));

export default useChoroplethMapStore;
