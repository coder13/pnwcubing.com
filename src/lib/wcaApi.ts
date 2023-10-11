export interface APICompetition {
  id: string;
  city: string;
  name: string;
  url: string;
  start_date: string;
  end_date: string;
  registration_open: string;
  registration_close: string;
  event_ids: string[];
}

/**
 * Fetches from production the upcoming competitions given a query string
 * @param query
 * @returns
 */
export const fetchUpcomingComps = async (
  query: string,
): Promise<APICompetition[]> => {
  const res = await fetch(
    "https://www.worldcubeassociation.org/api/v0/competitions?q=" +
      query +
      "&start=" +
      new Date().toISOString().split("T")[0],
  );

  if (!res.ok) {
    throw new Error("Network response was not ok.");
  }

  return res.json();
};
