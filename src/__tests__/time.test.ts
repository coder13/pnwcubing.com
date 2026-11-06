import assert from "node:assert/strict";
import { test } from "node:test";
import { formatRegistrationTime } from "../lib/time";

test("server-rendered registration times use labeled Pacific time in winter and summer", () => {
  assert.equal(
    formatRegistrationTime("2027-01-15T20:00:00Z"),
    "Jan 15, 2027, 12:00 PM PST",
  );
  assert.equal(
    formatRegistrationTime("2027-07-15T20:00:00Z"),
    "Jul 15, 2027, 1:00 PM PDT",
  );
});
