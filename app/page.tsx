import { HomeHero, PopularHealthTopics } from "./components/HomePageSections";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="bg-[#F8F7F4] text-[#0E2038]">
      <HomeHero />
      <PopularHealthTopics />
    </main>
  );
}
