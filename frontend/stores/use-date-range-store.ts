import { create } from 'zustand';

interface DateRangeState {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  reset: () => void;
}

const useDateRangeStore = create<DateRangeState>()((set) => ({
  startDate: '',
  endDate: '',
  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
  reset: () => set({ startDate: '', endDate: '' }),
}));

export default useDateRangeStore;
