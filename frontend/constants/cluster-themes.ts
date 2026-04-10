export const CLUSTER_THEMES = [
  {
    gradient: "from-[#7eb8e0]/10 to-[#6aa8d0]/5",
    iconBg: "bg-gradient-to-br from-[#7eb8e0] to-[#6aa8d0]",
    shadow: "shadow-[#7eb8e0]/10",
    accentText: "text-[#5a98c0]",
    border: "border-[#7eb8e0]/30",
    accentBg: "bg-[#7eb8e0]/10",
    badgeBg: "bg-[#7eb8e0]/15 text-[#5a98c0] border-[#7eb8e0]/20",
  },
  {
    gradient: "from-[#22c55e]/10 to-[#1db353]/5",
    iconBg: "bg-gradient-to-br from-[#22c55e] to-[#1db353]",
    shadow: "shadow-[#22c55e]/10",
    accentText: "text-[#189e48]",
    border: "border-[#22c55e]/30",
    accentBg: "bg-[#22c55e]/10",
    badgeBg: "bg-[#22c55e]/15 text-[#189e48] border-[#22c55e]/20",
  },
  {
    gradient: "from-[#b8a0d8]/10 to-[#a890c8]/5",
    iconBg: "bg-gradient-to-br from-[#b8a0d8] to-[#a890c8]",
    shadow: "shadow-[#b8a0d8]/10",
    accentText: "text-[#9880b8]",
    border: "border-[#b8a0d8]/30",
    accentBg: "bg-[#b8a0d8]/10",
    badgeBg: "bg-[#b8a0d8]/15 text-[#9880b8] border-[#b8a0d8]/20",
  },
  {
    gradient: "from-[#e8b86d]/10 to-[#d8a85d]/5",
    iconBg: "bg-gradient-to-br from-[#e8b86d] to-[#d8a85d]",
    shadow: "shadow-[#e8b86d]/10",
    accentText: "text-[#c8984d]",
    border: "border-[#e8b86d]/30",
    accentBg: "bg-[#e8b86d]/10",
    badgeBg: "bg-[#e8b86d]/15 text-[#c8984d] border-[#e8b86d]/20",
  },
  {
    gradient: "from-[#e8a0b8]/10 to-[#d890a8]/5",
    iconBg: "bg-gradient-to-br from-[#e8a0b8] to-[#d890a8]",
    shadow: "shadow-[#e8a0b8]/10",
    accentText: "text-[#c88098]",
    border: "border-[#e8a0b8]/30",
    accentBg: "bg-[#e8a0b8]/10",
    badgeBg: "bg-[#e8a0b8]/15 text-[#c88098] border-[#e8a0b8]/20",
  },
  {
    gradient: "from-[#90a8d8]/10 to-[#8098c8]/5",
    iconBg: "bg-gradient-to-br from-[#90a8d8] to-[#8098c8]",
    shadow: "shadow-[#90a8d8]/10",
    accentText: "text-[#7088b8]",
    border: "border-[#90a8d8]/30",
    accentBg: "bg-[#90a8d8]/10",
    badgeBg: "bg-[#90a8d8]/15 text-[#7088b8] border-[#90a8d8]/20",
  },
  {
    gradient: "from-[#7ec8c8]/10 to-[#6eb8b8]/5",
    iconBg: "bg-gradient-to-br from-[#7ec8c8] to-[#6eb8b8]",
    shadow: "shadow-[#7ec8c8]/10",
    accentText: "text-[#5ea8a8]",
    border: "border-[#7ec8c8]/30",
    accentBg: "bg-[#7ec8c8]/10",
    badgeBg: "bg-[#7ec8c8]/15 text-[#5ea8a8] border-[#7ec8c8]/20",
  },
  {
    gradient: "from-[#e8706a]/10 to-[#d8605a]/5",
    iconBg: "bg-gradient-to-br from-[#e8706a] to-[#d8605a]",
    shadow: "shadow-[#e8706a]/10",
    accentText: "text-[#c8504a]",
    border: "border-[#e8706a]/30",
    accentBg: "bg-[#e8706a]/10",
    badgeBg: "bg-[#e8706a]/15 text-[#c8504a] border-[#e8706a]/20",
  },
];

export const DISEASE_THEMES: Record<string, (typeof CLUSTER_THEMES)[0]> = {
  // Highly Contagious (Danger/Red themes)
  Measles: CLUSTER_THEMES[7],
  Influenza: CLUSTER_THEMES[4],
  // Vector-borne / Endemic (Severity/Warning themes)
  Dengue: CLUSTER_THEMES[3],
  Typhoid: CLUSTER_THEMES[6],
  Diarrhea: CLUSTER_THEMES[1],
  Pneumonia: CLUSTER_THEMES[2],
};

export const getThemeForDisease = (
  diseaseName: string | null | undefined,
  rankIndex: number = 0,
) => {
  if (diseaseName && DISEASE_THEMES[diseaseName]) {
    return DISEASE_THEMES[diseaseName];
  }
  return CLUSTER_THEMES[rankIndex % CLUSTER_THEMES.length];
};
