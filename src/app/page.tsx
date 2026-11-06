import { Metadata } from "next";
import { CmsBlocks } from "@/components/CmsBlocks";

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
          <CmsBlocks page="home" bare />
        </div>
      </section>
    </main>
  );
}
