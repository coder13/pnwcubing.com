"use client";

import "@cubing/icons";

// import { isLikelyStateChampionship } from "@/lib/competitions";
import { formatDateRange } from "@/lib/time";
import { APICompetition } from "@/lib/wcaApi";

import { Alert } from "flowbite-react";
import { activityCodeToName } from "@wca/helpers";
import { formatDistance } from "date-fns/formatDistance";

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
      className="w-full block p-6 bg-white border border-gray-200 rounded-lg drop-shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 hover:drop-shadow-md transition-all duration-150"
      href={url}
      target="_blank"
    >
      <p className="flex justify-between">
        <span className="text-lg sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {name}
        </span>
        <span className="text-base sm:text-lg">
          {formatDateRange(start_date, end_date)}
        </span>
      </p>
      <p className="font-normal text-gray-700 dark:text-gray-400 flex justify-between">
        <span>{city}</span>
        <span className="space-x-2">
          {event_ids.map((eventId) => (
            <i
              key={eventId}
              className={`text-lg cubing-icon event-${eventId}`}
              aria-label={activityCodeToName(eventId)}
            />
          ))}
        </span>
      </p>
      {isRegistrationOpen ? (
        <Alert color={isRegistrationClosed ? "failure" : "success"}>
          <span className="font-medium">
            {isRegistrationClosed ? (
              "Registration Closed!"
            ) : (
              <>
                Registration open for{" "}
                {formatDistance(Date.now(), new Date(registration_close))}
                <br />
                Closes on {new Date(registration_close).toLocaleString()}
              </>
            )}
          </span>
        </Alert>
      ) : (
        <Alert color="info">
          <span className="font-medium">
            Registration opens in{" "}
            {formatDistance(Date.now(), new Date(registration_open))} at{" "}
            {new Date(registration_open).toLocaleString()}
          </span>
        </Alert>
      )}
    </a>
  );
}
