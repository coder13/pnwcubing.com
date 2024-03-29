import { CompetitionCard } from "@/components/CompetitionCard";
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

export const revalidate = 60; // revalidate api every 60 seconds

export default async function Delegates() {
  const competitions = await getCompetitions();

  return (
    <main className="flex justify-center flex-1 py-2 h-full">
      <div className="flex flex-col w-full max-w-screen-md p-4 space-y-2">
        <h1 className="text-4xl">Upcoming Competitions</h1>
        <p>
          The PNW has competitions all across Washington, Oregon, Alaska, BC,
          and parts of Idaho and Monatana.
        </p>
        <p>
          All competitions are open to all competitors of all ages and
          experiences. If registration has closed for a competition, you might
          be able to still visit it if the competition allows. Check on the
          competition&apos;s website for more information on if spectators are
          allowed.
        </p>
        <br />
        <div className="flex flex-col w-full space-y-4 pb-12">
          {competitions.map((competition) => (
            <CompetitionCard key={competition.id} {...competition} />
          ))}
        </div>
      </div>
    </main>
  );
}
