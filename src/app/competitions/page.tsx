import { CompetitionCard } from "@/components/CompetitionCard";
import { fetchUpcomingComps } from "@/lib/wcaApi";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Competitions | pnwcubing",
};

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
    <main className="flex flex-col justify-center flex-1 leading-8">
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full">
          <h2 className="text-4xl">Upcoming Competitions</h2>
        </div>
      </section>

      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-secondary bg-opacity-80">
        <div className="flex flex-col md:w-2/3 w-full">
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
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full">
          <div className="flex flex-col w-full space-y-4 pb-12">
            {competitions.map((competition) => (
              <CompetitionCard key={competition.id} {...competition} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
