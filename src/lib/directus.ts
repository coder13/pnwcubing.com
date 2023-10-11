import { createDirectus } from "@directus/sdk";
import { rest } from "@directus/sdk/rest";

export interface Delegate {
  id: string;
  name: string;
  email: string;
  Region: string;
  Description: string;
  date_updated: string;
  wcaId: string;
}

export interface Schema {
  Delegates: Delegate[];
}

const directus = createDirectus<Schema>("https://admin.pnwcubing.com").with(
  rest(),
);

export default directus;
