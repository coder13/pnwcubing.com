import { DelegateDetails } from "@/components/DelegateDetails";
import directus, { Delegate } from "../../lib/directus";
import { readItems } from "@directus/sdk/rest";
import { Fragment } from "react";

async function getDelegates() {
  return directus.request(readItems("Delegates"));
}

export default async function Delegates() {
  const delegates = await getDelegates();

  const delegatesGroupedByRegion = delegates.reduce(
    (acc, d) => ({
      ...acc,
      [d.Region]: [...(acc[d.Region] || []), d],
    }),
    {} as Record<string, Delegate[]>,
  );

  return (
    <>
      <h2 className="text-4xl">Delegates</h2>
      <br />
      <div className="space-y-4">
        {Object.entries(delegatesGroupedByRegion).map(([region, delegates]) => (
          <div key={region} className="space-y-4">
            <h3 className="text-3xl">{region}</h3>
            {delegates.map((d) => (
              <Fragment key={d.id}>
                <hr />
                <DelegateDetails {...d} />
              </Fragment>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
