import Link from "next/link";

export default function Delegates() {
  return (
    <main className="flex justify-center flex-1">
      <div className="flex flex-col w-full md:w-2/3 px-4 space-y-4 py-4 leading-8">
        <div>
          <h1 className="text-4xl">Contact</h1>
          <p>Get in touch with us</p>
        </div>
        <div>
          <h2 className="text-2xl">Have a quick question?</h2>
          <p>
            If you have any questions, comments, or concerns, please feel free
            to reach out to us at{" "}
            <a
              className="text-primary hover:underline"
              href="mailto:support@pnwcubing.com"
              target="_blank"
              rel="noreferrer"
            >
              Support@pnwcubing.com
            </a>
          </p>
        </div>

        <div>
          <h2 className="text-2xl">Want to organize a competition?</h2>
          <p>
            Competitions are not centrally organized and are rather organized by
            individuals willing to help
          </p>
          <p>
            If you are interested in organizing a competition, please check out
            our{" "}
            <Link className="text-primary hover:underline" href="/delegates">
              Delegates
            </Link>
            , identify your local delegate and reach out to them.
          </p>
        </div>
      </div>
    </main>
  );
}
