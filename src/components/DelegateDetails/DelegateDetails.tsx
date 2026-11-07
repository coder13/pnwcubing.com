import React from "react";
import { safeHtml } from "@/lib/editor/html";
import { Delegate } from "@/lib/directus";
import { getPerson } from "@/lib/wcaApi";
import { getWcaAccount } from "@/lib/wcaDelegates";
import Image from "next/image";
import { EmailButton } from "../EmailButton";

interface DelegateDetailsProps extends Delegate {}

export async function DelegateDetails({
  wcaId,
  wcaUserId,
  wcaStatus,
  name,
  pronouns,
  email,
  description,
}: DelegateDetailsProps) {
  const visiblePronouns = pronouns?.trim();
  const person = await (wcaUserId
    ? getWcaAccount(wcaUserId)
    : wcaId
    ? getPerson(wcaId)
    : Promise.resolve(null)
  ).catch(() => null);

  const showEmail =
    !!email &&
    !!wcaStatus &&
    wcaStatus !== "trainee_delegate" &&
    !!person &&
    "delegate_status" in person &&
    person.delegate_status !== "trainee_delegate";

  return (
    <div className="flex flex-col sm:flex-row w-full">
      <div className="flex flex-0 sm:min-w-min flex-col items-center justify-center space-y-1 py-2">
        {person?.avatar?.url && (
          <Image
            src={person.avatar.url}
            alt={`Avatar for ${name}`}
            placeholder="empty"
            width="0"
            height="0"
            sizes="100vw"
            style={{ width: "100%", height: "auto" }}
            className="min-w-[5rem] sm:max-w-[15rem]"
          />
        )}
        {showEmail && <EmailButton email={email} />}
      </div>
      <div className="flex flex-1 flex-col mx-4">
        <p>
          <span className="text-2xl">{name}</span>
          {wcaId ? ` (${wcaId})` : ""}
        </p>
        {visiblePronouns && (
          <p className="text-sm text-gray-600">{visiblePronouns}</p>
        )}
        <div
          className="rich-text py-2 whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: safeHtml(description) }}
        />
      </div>
    </div>
  );
}
