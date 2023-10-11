import { isLikelyStateChampionship } from "@/lib/competitions";
import { formatDateRange } from "@/lib/time";

interface CompetitionCardProps {
  id: string;
  city: string;
  name: string;
  url: string;
  start_date: string;
  end_date: string;
  registration_open: string;
  registration_close: string;
}

export default function CompetitionCard({
  id,
  city,
  name,
  url,
  start_date,
  end_date,
  registration_open,
  registration_close,
}: CompetitionCardProps) {
  const isRegistrationOpen = new Date(registration_open).getTime() < Date.now();
  const isRegistrationClosed =
    new Date(registration_close).getTime() < Date.now();

  return (
    <div style={{ margin: "0.5em 0" }}>
      <em>
        <a href={url} target="_blank" style={{ textDecoration: "none" }}>
          <strong className="leading-4">
            {formatDateRange(start_date, end_date)}
            {" — "}
            {name}
            {" — "}
            {city}
            <span className="text-red-600">
              {isLikelyStateChampionship(name) ? "[State Championship]" : ""}
            </span>
          </strong>
          <br />
          {isRegistrationOpen ? (
            <span className="text-red-600">
              {isRegistrationClosed
                ? "Registration ended"
                : "Registration open!"}
            </span>
          ) : (
            <span className="text-red-600">
              Registration opens {new Date(registration_open).toLocaleString()}
            </span>
          )}
        </a>
      </em>
    </div>
  );
}
