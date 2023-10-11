import { numSuffix } from "./utils";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const formatDateRange = (startDate: string, endDate: string) => {
  const start = new Date(
    new Date(startDate).getTime() +
      new Date(startDate).getTimezoneOffset() * 60 * 1000
  );
  const end = new Date(
    new Date(endDate).getTime() +
      new Date(endDate).getTimezoneOffset() * 60 * 1000
  );
  const startDay = `${start.getDate()}${numSuffix(start.getDate())}`;

  if (startDate === endDate) {
    return `${months[start.getMonth()]} ${startDay}`;
  }

  const endDay = `${end.getDate()}${numSuffix(end.getDate())}`;

  if (start.getMonth() === end.getMonth()) {
    return `${months[start.getMonth()]} ${startDay} - ${endDay}`;
  }

  return `${months[start.getMonth()]} ${startDay} - ${
    months[end.getMonth()]
  }/${endDay}`;
};
