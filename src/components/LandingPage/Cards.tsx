"use client";

import { Button, Card } from "flowbite-react";
import Link from "next/link";

export function LandingPageCards() {
  return (
    <div className="grid grid-cols-1 grid-rows-[min-content] lg:grid-cols-3 gap-4 lg:gap-8 auto-rows-fr">
      <Link href="/competitions" passHref className="grid-cols-1">
        <Card className="mb-auto row-span-1 h-full shadow-md hover:drop-shadow-xl">
          <h5 className="text-lg md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Competitions
          </h5>
          <p className="text-sm md:text-base font-normal text-gray-700 dark:text-gray-400 h-full">
            We host competitions throughout the year. Check out our upcoming
            competitions and past results.
          </p>
          <Button>
            View Competitions
            <svg
              className="-mr-1 ml-2 h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        </Card>
      </Link>
      <Link
        href="https://www.facebook.com/groups/pnwcubing"
        target="_blank"
        passHref
      >
        <Card className="mb-auto row-span-1 h-full shadow-md hover:drop-shadow-xl">
          <h5 className="text-lg md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            PNW Cubing Facebook Group
          </h5>
          <p className="text-sm md:text-base font-normal text-gray-700 dark:text-gray-400 h-full">
            If you or a parent have a Facebook account, we&apos;d highly
            recommend joining our Facebook group to hear about competitions in
            the Pacific Northwest before they&apos;re announced and keep in
            touch with cubers in the area.
          </p>
          <Button>
            Join Group
            <svg
              className="-mr-1 ml-2 h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        </Card>
      </Link>
      <Link href="http://eepurl.com/h3T0EL" target="_blank" passHref>
        <Card className="mb-auto row-span-1 h-full shadow-md hover:drop-shadow-xl">
          <h5 className="text-lg md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Subscribe to the PNW Monthly Newsletter!
          </h5>
          <p className="text-sm md:text-base font-normal text-gray-700 dark:text-gray-400 h-full">
            Your email will not be distributed to anyone. It will only be used
            for the PNW Monthly Newsletter.
          </p>
          <Button>
            Subscribe
            <svg
              className="-mr-1 ml-2 h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        </Card>
      </Link>
    </div>
  );
}
