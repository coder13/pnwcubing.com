export const faqFieldMapId = "__setup_faq_fields_v1";
const textFields = ["question", "answer"] as const;
export type FaqFieldMap = Record<(typeof textFields)[number], string>;

export function resolveFaqFields(names: string[]): FaqFieldMap {
  const mapping: FaqFieldMap = { question: "question", answer: "answer" };
  for (const name of textFields) {
    const matches = names.filter((value) => value.toLowerCase() === name);
    if (matches.length > 1)
      throw new Error(
        `FAQ has multiple fields named ${name} with different casing. Setup cannot choose which field to use.`,
      );
    mapping[name] = matches[0] || name;
  }
  return mapping;
}

export function parseFaqFieldMap(body: string): FaqFieldMap {
  const mapping = JSON.parse(body) as FaqFieldMap;
  if (
    !mapping ||
    textFields.some(
      (name) =>
        typeof mapping[name] !== "string" ||
        mapping[name].toLowerCase() !== name,
    )
  )
    throw new Error(
      "The FAQ field configuration is invalid. Run yarn cms:setup.",
    );
  return mapping;
}

export function encodeFaqItem(
  item: Record<string, unknown>,
  mapping: FaqFieldMap,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(item).map(([name, value]) => [
      name === "question" || name === "answer" ? mapping[name] : name,
      value,
    ]),
  );
}

export function decodeFaqItem<T>(item: T): T {
  if (!item || typeof item !== "object" || Array.isArray(item)) return item;
  const mapping = resolveFaqFields(Object.keys(item));
  const result = { ...item } as Record<string, unknown>;
  for (const name of textFields) {
    const source = mapping[name];
    if (source !== name) {
      result[name] = result[source];
      delete result[source];
    }
  }
  return result as T;
}
