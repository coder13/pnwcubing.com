import CompetitionCard from "@/components/CompetitionCard/CompetitionCard";
import { fetchUpcomingComps } from "@/lib/wcaApi";

async function getCompetitions() {
  const allComps = await Promise.all([
    fetchUpcomingComps("alaska"),
    fetchUpcomingComps("washington"),
    fetchUpcomingComps("oregon"),
    fetchUpcomingComps("British Columbia"),
    fetchUpcomingComps("sandpoint"),
    fetchUpcomingComps("missoula"),
  ]);

  return allComps
    .reduce((a, b) => [...a, ...b], [])
    .sort(
      (a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
    );
}

export default async function Delegates() {
  const competitions = await getCompetitions();

  return (
    <main>
      <h2>Competitions</h2>
      {competitions.map((competition) => (
        <CompetitionCard key={competition.id} {...competition} />
      ))}
    </main>
  );
}
