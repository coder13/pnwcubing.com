export const isLikelyStateChampionship = (name: string) => {
  return (
    (name.includes("Washington") ||
      name.includes("Oregon") ||
      name.includes("Alaska")) &&
    name.includes("Championship")
  );
};
