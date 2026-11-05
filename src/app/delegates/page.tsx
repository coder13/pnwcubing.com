import { CmsContent } from "@/components/CmsContent";
import { DelegateDetails } from "@/components/DelegateDetails";
import type { Delegate } from "@/lib/directus";
import { getPublicDelegates } from "@/lib/editor/content";
import { Fragment } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delegates | pnwcubing",
};

export const revalidate = 5; // revalidate api every 5 seconds

export default async function Delegates() {
  const delegates = await getPublicDelegates();

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
          <CmsContent contentKey="delegates.1" />
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-secondary bg-opacity-80">
        <div className="flex flex-col md:w-2/3 w-full">
          <CmsContent contentKey="delegates.2" />
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
