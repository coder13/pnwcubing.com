import { createDirectus } from "@directus/sdk";
import { rest } from "@directus/sdk/rest";

interface Delegate {
  id: string;
  name: string;
  email: string;
  region: string;
  description: string;
  Region: string;
}

interface Schema {
  Delegates: Delegate[];
}

const directus = createDirectus<Schema>("https://admin.pnwcubing.com").with(
  rest(),
);

export default directus;
