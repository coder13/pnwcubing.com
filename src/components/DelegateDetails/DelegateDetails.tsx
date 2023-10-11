import { Delegate } from "@/lib/directus";
import { getPerson } from "@/lib/wcaApi";
import Image from "next/image";

interface DelegateDetailsProps extends Delegate {}

export async function DelegateDetails({
  wcaId,
  name,
  Description,
}: DelegateDetailsProps) {
  const person = await getPerson(wcaId);

  return (
    <div className="flex w-full">
      <div className="flex flex-grow min-w-[15rem] flex-col items-center justify-center">
        <Image
          src={person?.avatar?.url || ""}
          alt={`Avatar for ${name}`}
          placeholder="empty"
          width="200"
          height="200"
        />
      </div>
      <div className="flex flex-0 flex-col mx-4">
        <p>
          <span className="text-2xl">{name}</span> ({wcaId})
        </p>
        <p>{Description}</p>
      </div>
    </div>
  );
}
