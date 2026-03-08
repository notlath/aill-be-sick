import { create } from 'zustand';

export type MapTab = 'by-disease' | 'by-cluster' | 'by-anomaly';

interface MapState {
  activeTab: MapTab;
  setActiveTab: (tab: MapTab) => void;
  reset: () => void;
}

const useMapStore = create<MapState>()((set) => ({
  activeTab: 'by-disease',
  setActiveTab: (tab) => set({ activeTab: tab }),
  reset: () => set({ activeTab: 'by-disease' }),
}));

export default useMapStore;
