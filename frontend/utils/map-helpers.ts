export function getColor(count: number): string {
  return count > 80
    ? "#800026"
    : count > 60
      ? "#BD0026"
      : count > 40
        ? "#E31A1C"
        : count > 20
          ? "#FC4E2A"
          : count > 10
            ? "#FD8D3C"
            : count > 5
              ? "#FEB24C"
              : "#FFEDA0";
}
