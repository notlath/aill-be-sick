import { create } from 'zustand';

export type MapTab = 'by-disease' | 'by-cluster' | 'by-anomaly';

export interface FocusLocation {
  lat: number;
  lng: number;
  zoom?: number;
}

interface MapState {
  activeTab: MapTab;
  setActiveTab: (tab: MapTab) => void;
  reset: () => void;
  focusLocation: FocusLocation | null;
  focusDisease: string | null;
  setFocusLocation: (location: FocusLocation | null) => void;
  setFocusDisease: (disease: string | null) => void;
  clearFocus: () => void;
}

const useMapStore = create<MapState>()((set) => ({
  activeTab: 'by-disease',
  setActiveTab: (tab) => set({ activeTab: tab }),
  reset: () => set({ activeTab: 'by-disease' }),
  focusLocation: null,
  focusDisease: null,
  setFocusLocation: (location) => set({ focusLocation: location }),
  setFocusDisease: (disease) => set({ focusDisease: disease }),
  clearFocus: () => set({ focusLocation: null, focusDisease: null }),
}));

export default useMapStore;
