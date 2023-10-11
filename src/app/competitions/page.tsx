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
    <>
      <h1 className="text-4xl">Upcoming Competitions</h1>
      <p>
        The PNW has competitions all across Washington, Oregon, Alaska, BC, and
        parts of Idaho and Monatana.
      </p>
      <p>
        All competitions are open to all competitors of all ages and
        experiences. If registration has closed for a competition, you might be
        able to still visit it if the competition allows.
      </p>
      <br />
      <div className="flex flex-col w-full space-y-2">
        {competitions.map((competition) => (
          <CompetitionCard key={competition.id} {...competition} />
        ))}
      </div>
    </>
  );
}
