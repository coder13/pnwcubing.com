import { Delegate } from "@/lib/directus";
import { getPerson } from "@/lib/wcaApi";
import Image from "next/image";
import { EmailButton } from "../EmailButton";

interface DelegateDetailsProps extends Delegate {}

export async function DelegateDetails({
  wcaId,
  name,
  email,
  description,
}: DelegateDetailsProps) {
  const person = await getPerson(wcaId);

  return (
    <div className="flex flex-col sm:flex-row w-full">
      <div className="flex flex-0 sm:min-w-min flex-col items-center justify-center space-y-1 py-2">
        <Image
          src={person?.avatar?.url || ""}
          alt={`Avatar for ${name}`}
          placeholder="empty"
          width="0"
          height="0"
          sizes="100vw"
          style={{ width: "100%", height: "auto" }}
          className="min-w-[5rem] sm:max-w-[15rem]"
        />
        {email && <EmailButton email={email} />}
      </div>
      <div className="flex flex-1 flex-col mx-4">
        <p>
          <span className="text-2xl">{name}</span> ({wcaId})
        </p>
        <p className="py-2">{description}</p>
      </div>
    </div>
  );
}
