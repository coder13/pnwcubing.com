import { CmsContent } from "@/components/CmsContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "For-Parents | pnwcubing",
};

export default function ForParents() {
  return (
    <main className="flex flex-col justify-center flex-1 leading-8">
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full">
          <CmsContent contentKey="parents.1" />
        </div>
      </section>

      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-secondary bg-opacity-80">
        <div className="flex flex-col md:w-2/3 w-full">
          <CmsContent contentKey="parents.2" />
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full">
          <CmsContent contentKey="parents.3" />
        </div>
      </section>
    </main>
  );
}
