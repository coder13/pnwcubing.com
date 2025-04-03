import { DelegateDetails } from "@/components/DelegateDetails";
import directus, { Delegate } from "../../lib/directus";
import { readItems } from "@directus/sdk/rest";
import { Fragment } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delegates | pnwcubing",
};

async function getDelegates() {
  try {
    return await directus.request(readItems("Delegates"));
  } catch (e: any) {
    console.error(e.errors);
    return [];
  }
}

export const revalidate = 5; // revalidate api every 5 seconds

export default async function Delegates() {
  const delegates = await getDelegates();

  const delegatesGroupedByRegion =
    delegates?.reduce(
      (acc, d) => ({
        ...acc,
        [d.region]: [...(acc[d.region] || []), d],
      }),
      {} as Record<string, Delegate[]>,
    ) || [];

  return (
    <main className="flex flex-col flex-1 h-full">
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full">
          <h2 className="text-4xl">Delegates</h2>
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-secondary bg-opacity-80">
        <div className="flex flex-col md:w-2/3 w-full">
          <div className="space-y-1">
            <p className="font-bold">What Does a Delegate do?</p>
            <p>
              Delegates are the officials of the WCA, and they are responsible
              for ensuring the WCA Regulations are followed during the
              competition. They also handle incidents and are responsible for
              scrambles and results. If you ever have any doubts or questions,
              they should be your first choice for asking.
            </p>
            <p className="font-bold">Get to Know Your Local Delegates</p>
            <p>
              Below you can find your local delegates in Oregon, Washington and
              British Columbia! Unfortunately, all other PNW states do not have
              a delegate, however these delegates are willing to travel under
              the right circumstances! If you are interesting in organizing your
              own competition, feel free to contact one or multiple of your
              local delegates letting them know of your interest.
            </p>
          </div>
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full space-4">
          {Object.entries(delegatesGroupedByRegion).map(
            ([region, delegates]) => (
              <div key={region} className="space-y-4">
                <h3 className="text-3xl text-center text-primary">{region}</h3>
                {delegates.map((d) => (
                  <Fragment key={d.id}>
                    <hr />
                    <DelegateDetails {...d} />
                  </Fragment>
                ))}
              </div>
            ),
          )}
        </div>
      </section>
    </main>
  );
}
