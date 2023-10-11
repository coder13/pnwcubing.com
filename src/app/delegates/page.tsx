import directus from "../../lib/directus";
import { readItems } from "@directus/sdk/rest";

async function getDelegates() {
  return directus.request(readItems("Delegates"));
}

export default async function Delegates() {
  const delegates = await getDelegates();

  return (
    <main>
      <h2>Delegates</h2>
      {delegates.map((d) => (
        <p key={d.id}>{d.name}</p>
      ))}
    </main>
  );
}
