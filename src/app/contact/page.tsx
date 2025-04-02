import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact | pnwcubing",
};

export default function Contact() {
  return (
    <main className="flex flex-col justify-center flex-1 leading-8">
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full">
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
                href="mailto:contact@pnwcubing.com"
                target="_blank"
                rel="noreferrer"
              >
                contact@pnwcubing.com
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-2xl">Want to organize a competition?</h2>
            <p>
              Competitions are not centrally organized and are rather organized
              by individuals willing to help
            </p>
            <p>
              If you are interested in organizing a competition, please check
              out our{" "}
              <Link className="text-primary hover:underline" href="/delegates">
                Delegates
              </Link>
              , identify your local delegate and reach out to them.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
