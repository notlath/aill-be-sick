import { create } from 'zustand';

export type DiseaseType = 'all' | 'Dengue' | 'Pneumonia' | 'Typhoid' | 'Impetigo' | 'Diarrhea' | 'Measles' | 'Influenza';

interface SelectedDiseaseState {
  selectedDisease: DiseaseType;
  setSelectedDisease: (disease: DiseaseType) => void;
  reset: () => void;
}

const useSelectedDiseaseStore = create<SelectedDiseaseState>()((set) => ({
  selectedDisease: 'all',
  setSelectedDisease: (disease) => set({ selectedDisease: disease }),
  reset: () => set({ selectedDisease: 'all' }),
}));

export default useSelectedDiseaseStore;
