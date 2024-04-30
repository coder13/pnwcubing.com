import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | pnwcubing",
};

export default function About() {
  return (
    <main className="flex flex-col justify-center flex-1 leading-8">
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full">
          <h1 className="text-4xl">About</h1>
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-secondary bg-opacity-80">
        <div className="flex flex-col md:w-2/3 w-full">
          <div>
            <b>PNW Cubing</b> is a 501(c)(3) non-profit organization that aims
            to promote the sport of speedcubing in the Pacific Northwest. We
            host WCA-sanctioned competitions to support and grow the community.
          </div>
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full">
          <h4 className="text-2xl py-2">Our Team</h4>
          <h5 className="font-bold text-lg py-1">Board of Directors</h5>
          <ul className="flex flex-col px-4">
            <li className="list-disc">Cailyn Hoover - Chair</li>
            <li className="list-disc">Chris Tabar - Treasurer</li>
            <li className="list-disc">Matthew Dickman - Secretary</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
