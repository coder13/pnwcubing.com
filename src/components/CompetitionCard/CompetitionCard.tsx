"use client";

// import { isLikelyStateChampionship } from "@/lib/competitions";
import { formatDateRange } from "@/lib/time";
import { APICompetition } from "@/lib/wcaApi";

import { Alert } from "flowbite-react";

interface CompetitionCardProps extends APICompetition {}

export function CompetitionCard({
  city,
  name,
  url,
  start_date,
  end_date,
  registration_open,
  registration_close,
  event_ids,
  ...props
}: CompetitionCardProps) {
  const isRegistrationOpen = new Date(registration_open).getTime() < Date.now();
  const isRegistrationClosed =
    new Date(registration_close).getTime() < Date.now();

  return (
    <a
      className="w-full block  p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
      href={url}
      target="_blank"
    >
      <p className="flex justify-between">
        <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {name}
        </span>
        <span>{formatDateRange(start_date, end_date)}</span>
      </p>
      <p className="font-normal text-gray-700 dark:text-gray-400 flex justify-between">
        <span>{city}</span>
        <span>{event_ids.join(", ")}</span>
      </p>
      {isRegistrationOpen ? (
        <Alert color={isRegistrationClosed ? "failure" : "success"}>
          <span className="font-medium">
            {isRegistrationClosed
              ? "Registration Closed!"
              : "Registration Open!"}
          </span>
        </Alert>
      ) : (
        <Alert color="info">
          <span className="font-medium">
            Registration opens {new Date(registration_open).toLocaleString()}
          </span>
        </Alert>
      )}
    </a>
  );
}
