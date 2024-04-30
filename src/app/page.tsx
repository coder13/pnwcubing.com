import { LandingPageCards } from "@/components/LandingPage/Cards";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home | pnwcubing",
};

export default function Home() {
  return (
    <main className="overflow-hidden">
      <section
        style={{
          background: "url(/images/landing.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "",
          opacity: 0.7,
          width: "100vw",
          height: "calc(100vh - 5em)",
        }}
        className="grid grid-rows-[min_content] items-center justify-center overflow-auto"
      >
        <div className="flex flex-col h-max drop-shadow-md text-white text-center p-4 justify-evenly">
          <h1
            className="text-6xl md:text-7xl h-80"
            style={{
              textShadow:
                "2px 2px 4px rgba(0, 0, 0, 0.5)" /* Optional text shadow for better readability */,
            }}
          >
            Pacific Northwest Cubing
          </h1>
          <LandingPageCards />
        </div>
      </section>
    </main>
  );
}
