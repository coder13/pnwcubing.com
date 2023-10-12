import { DelegateDetails } from "@/components/DelegateDetails";
import directus from "../../lib/directus";
import { readItems } from "@directus/sdk/rest";
import { Fragment } from "react";

async function getDelegates() {
  return directus.request(readItems("Delegates"));
}

export default async function Delegates() {
  const delegates = await getDelegates();
  return (
    <>
      <h2 className="text-4xl">Delegates</h2>
      <br />
      <div className="space-y-4">
        {delegates.map((d) => (
          <Fragment key={d.id}>
            <hr />
            <DelegateDetails {...d} />
          </Fragment>
        ))}
      </div>
    </>
  );
}
