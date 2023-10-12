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
      <div className="flex flex-0 min-w-[5rem] sm:min-w[10rem] md:min-w-[15rem] flex-col items-center justify-center">
        <Image
          src={person?.avatar?.url || ""}
          alt={`Avatar for ${name}`}
          placeholder="empty"
          width="0"
          height="0"
          sizes="100vw"
          style={{ width: "100%", height: "auto" }}
          className="min-w-[5rem] sm:max-w-[10rem] md:max-w-[15rem]"
        />
      </div>
      <div className="flex flex-1 flex-col mx-4">
        <p>
          <span className="text-2xl">{name}</span> ({wcaId})
        </p>
        <p className="py-2">{Description}</p>
      </div>
    </div>
  );
}
