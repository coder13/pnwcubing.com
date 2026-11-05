import type { ContentCollection } from "./types";
import { statuses } from "./types";

export class ValidationError extends Error {}

export function validateContent(
  collection: ContentCollection,
  value: unknown,
  create: boolean,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ValidationError("Enter a valid record.");
  const input = value as Record<string, unknown>;
  const fields: Record<ContentCollection, string[]> = {
    Delegates: [
      "name",
      "wcaId",
      "email",
      "region",
      "description",
      "status",
      "sort",
    ],
    FAQ: ["question", "answer", "status", "sort"],
    SiteContent: ["body", "status"],
    SiteEditors: ["name", "active"],
  };
  const allowed = [
    ...fields[collection],
    ...(create && collection === "SiteEditors" ? ["id"] : []),
  ];
  if (Object.keys(input).some((key) => !allowed.includes(key)))
    throw new ValidationError(
      "This record contains fields that you cannot change.",
    );
  for (const field of fields[collection]) {
    if (!(field in input)) throw new ValidationError(`Enter ${field}.`);
  }
  for (const [field, value] of Object.entries(input)) {
    if (field === "active") {
      if (typeof value !== "boolean")
        throw new ValidationError("Active must be true or false.");
    } else if (field === "sort" || field === "id") {
      if (
        typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value < (field === "id" ? 1 : 0)
      )
        throw new ValidationError(`Enter a valid ${field}.`);
    } else {
      if (
        typeof value !== "string" ||
        value.length >
          (field === "body"
            ? 100000
            : field === "description" || field === "answer"
            ? 10000
            : 300)
      )
        throw new ValidationError(`Enter a valid ${field}.`);
      if (
        ["name", "region", "question", "wcaId"].includes(field) &&
        !value.trim()
      )
        throw new ValidationError(`Enter ${field}.`);
    }
  }
  if (
    "status" in input &&
    !statuses.includes(input.status as (typeof statuses)[number])
  )
    throw new ValidationError("Select a valid publication status.");
  if (collection === "Delegates") {
    if (!/^\d{4}[A-Z]{4}\d{2}$/.test(String(input.wcaId)))
      throw new ValidationError("Enter a WCA ID, such as 2010SINQ01.");
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.email)))
      throw new ValidationError("Enter a valid email address.");
  }
  return input;
}

export function validateDelegateProfile(
  value: unknown,
  wcaId: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ValidationError("Enter a valid record.");
  if ("wcaId" in value)
    throw new ValidationError("You cannot change your WCA ID here.");
  const { wcaId: _wcaId, ...profile } = validateContent(
    "Delegates",
    { ...value, wcaId },
    false,
  );
  return profile;
}
