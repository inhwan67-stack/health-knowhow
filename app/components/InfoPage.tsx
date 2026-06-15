import Link from "next/link";

export type InfoSection = {
  title: string;
  body: string[];
};

export default function InfoPage({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: InfoSection[];
}) {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-[#173d2d]">
      <section className="border-b border-[#dfe8d8] bg-[linear-gradient(135deg,#fffdf7_0%,#edf7e7_58%,#dcebd4_100%)]">
        <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 lg:px-12">
          <Link href="/" className="text-sm font-bold text-[#2f6c48] hover:text-[#173d2d]">
            Health Knowhow
          </Link>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-[#123827] sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-[#355845]">{description}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1120px] gap-5 px-5 py-12 sm:px-8 lg:px-12">
        {sections.map((section) => (
          <article key={section.title} className="rounded-lg border border-[#dde6d7] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#173d2d]">{section.title}</h2>
            <div className="mt-4 grid gap-3 text-base leading-8 text-[#526257]">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
