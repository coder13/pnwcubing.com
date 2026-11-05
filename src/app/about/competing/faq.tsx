import { getPublicFaq } from "@/lib/editor/content";

export default async function FAQ() {
  const questions = await getPublicFaq();
  return (
    <div className="divide-y rounded border">
      {questions.map((item) => (
        <details key={item.id} className="p-4">
          <summary className="cursor-pointer font-semibold">
            {item.question}
          </summary>
          <p className="mt-3 whitespace-pre-wrap">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
