import { CmsContent } from "@/components/CmsContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | pnwcubing",
};

export default function About() {
  return (
    <main className="flex flex-col justify-center flex-1 leading-8">
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full">
          <CmsContent contentKey="about.1" />
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-secondary bg-opacity-80">
        <div className="flex flex-col md:w-2/3 w-full">
          <CmsContent contentKey="about.2" />
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full">
          <CmsContent contentKey="about.3" />
        </div>
      </section>
    </main>
  );
}
