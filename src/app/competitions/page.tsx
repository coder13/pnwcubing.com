import { CmsBlocks } from "@/components/CmsBlocks";
import { CompetitionCard } from "@/components/CompetitionCard";
import { fetchUpcomingComps } from "@/lib/wcaApi";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Competitions | pnwcubing",
};

const ALLOWED_REGIONS = [
  "Washington",
  "Oregon",
  "Alaska",
  "British Columbia",
  "Idaho",
  "Montana",
];

async function getCompetitions() {
  const allComps = await Promise.all([
    fetchUpcomingComps("washington"),
    fetchUpcomingComps("oregon"),
    fetchUpcomingComps("alaska"),
    fetchUpcomingComps("British Columbia"),
    fetchUpcomingComps("idaho"),
    fetchUpcomingComps("montana"),
    fetchUpcomingComps("NorthwestFMCChampionship"),
  ]);

  // comp.city in form of "Seattle, Washington", match on state
  // FMCChamps has city "Multiple Cities", requires exception
  return allComps
    .flat()
    .filter(
      (comp) =>
        ALLOWED_REGIONS.some(
          (region) => comp.city.split(", ").at(-1) === region,
        ) || comp.id.startsWith("NorthwestFMCChampionship"),
    )
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
      <CmsBlocks page="competitions" />
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
