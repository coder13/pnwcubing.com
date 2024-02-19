"use client";

import { Card } from "flowbite-react";
import Link from "next/link";

export function LandingPageCards() {
  return (
    <div className="py-4 px-8 grid grid-cols-1 grid-rows-[min-content] lg:grid-cols-3 gap-4 lg:gap-8 auto-rows-fr translate-y-40">
      <Link href="/competitions" passHref className="grid-cols-1">
        <Card className="mb-auto row-span-1 h-full">
          <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Competitions
          </h5>
          <p className="font-normal text-gray-700 dark:text-gray-400 h-full">
            We host competitions throughout the year. Check out our upcoming
            competitions and past results.
          </p>
        </Card>
      </Link>
      <Link href="/competitions" target="_blank" passHref>
        <Card className="mb-auto row-span-1 h-full">
          <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            PNW Cubing Facebook Group
          </h5>
          <p className="font-normal text-gray-700 dark:text-gray-400 h-full">
            If you or a parent have a Facebook account, we&apos;d highly
            recommend joining our Facebook group to hear about competitions in
            the Pacific Northwest before they&apos;re announced and keep in
            touch with cubers in the area.
          </p>
        </Card>
      </Link>
      <Link href="http://eepurl.com/h3T0EL" target="_blank" passHref>
        <Card className="mb-auto row-span-1 h-full">
          <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Subscribe to the PNW Monthly Newsletter!
          </h5>
          <p className="font-normal text-gray-700 dark:text-gray-400 h-full">
            Your email will not be distributed to anyone. It will only be used
            for the PNW Monthly Newsletter.
          </p>
        </Card>
      </Link>
    </div>
  );
}
