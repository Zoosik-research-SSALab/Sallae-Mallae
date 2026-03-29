import { create } from "zustand";
import { persist } from "zustand/middleware";

type DebateSettingsState = {
  isMuted: boolean;
  toggleMute: () => void;
};

export const useDebateSettingsStore = create<DebateSettingsState>()(
  persist(
    (set) => ({
      isMuted: false,
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
    }),
    {
      name: "debate-settings",
    },
  ),
);
