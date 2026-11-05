import { CmsContent } from "@/components/CmsContent";
import { Metadata } from "next";
import FAQ from "./faq";

export const metadata: Metadata = {
  title: "About Competing | pnwcubing",
};

export default function AboutCompeting() {
  return (
    <main className="flex flex-col justify-center flex-1 leading-8 pb-12">
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full">
          <CmsContent contentKey="competing.1" />
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-secondary bg-opacity-80">
        <div className="flex flex-col md:w-2/3 w-full">
          <CmsContent contentKey="competing.2" />
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full space-y-4">
          <CmsContent contentKey="competing.3" className="space-y-4" />
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-secondary bg-opacity-80">
        <div className="flex flex-col md:w-2/3 w-full space-y-4">
          <CmsContent contentKey="competing.4" className="space-y-4" />
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full space-y-4">
          <CmsContent contentKey="competing.5" className="space-y-4" />
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-secondary bg-opacity-80">
        <div className="flex flex-col md:w-2/3 w-full space-y-4">
          <CmsContent contentKey="competing.6" className="space-y-4" />
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full space-y-4">
          <CmsContent contentKey="competing.7" />
          <FAQ />
        </div>
      </section>
    </main>
  );
}
