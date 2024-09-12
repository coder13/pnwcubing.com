export const numSuffix = (num: number) => {
  if (num % 100 < 11 || num % 100 > 19) {
    switch (num % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  }
  return "th";
};
