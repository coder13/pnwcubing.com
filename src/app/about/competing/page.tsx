import { Metadata } from "next";
import Image from "next/image";
import FAQ from "./faq";

export const metadata: Metadata = {
  title: "About Competing | pnwcubing",
};

export default function AboutCompeting() {
  return (
    <main className="flex flex-col justify-center flex-1 leading-8 pb-12">
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full">
          <h1 className="text-4xl">PNW Competitions</h1>
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-secondary bg-opacity-80">
        <div className="flex flex-col md:w-2/3 w-full">
          <p>
            For those of you new to cubing, <b>WELCOME!</b> We&apos;re excited
            to have you join us in the world of speedcubing. Our competitions
            have historically been an amazing space for people of all ages to
            come together and meet with like-minded individuals.
          </p>
          <p>
            You&apos;re likely here because you are either looking to join a
            competition, have already registered, or want to come spectate. In
            either case we&apos;re excited to have you join us!
          </p>
          <p>
            Below you&apos;ll find information on attending and competing at WCA
            sanctioned competitions.
          </p>
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full space-y-4">
          <p>
            First, please be familiar with the{" "}
            <a
              className="text-blue-500 underline"
              href="https://www.worldcubeassociation.org/regulations/"
              target="_blank"
            >
              WCA Regulations
            </a>
            . Do not at all fee pressured to memorize these, but it is good to
            be familiar with them.
          </p>
          <p>
            All PNW competitions will have new competitor / judging tutorial but
            if you&apos;re looking for something to watch ahead of time, Kit
            Clement has a video tutorial for competing at competitions that is a
            great resource for new competitors. It&apos;s not a complete
            replacement for knowing the regulations but it&apos;s a great start.
          </p>
          <div className="flex w-full justify-center items-center">
            <iframe
              className="w-full xl:w-2/3  aspect-video"
              src="https://www.youtube.com/embed/dPL3eV-A0ww"
              loading="lazy"
            ></iframe>
          </div>
          <p>
            If you have any questions after this video, the tutorial at
            competitions will be the perfect time to ask those questions and
            clear up any confusion.
          </p>
          <p>
            If you are stoked to compete and ready to sign up, head back over to
            the competition page and on the registration tab, click register,
            and fill out the information it asks for. This will help you get set
            up the WCA&apos;s system and one step closer to your first official
            solve!
          </p>
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-secondary bg-opacity-80">
        <div className="flex flex-col md:w-2/3 w-full space-y-4">
          <h2 id="Responsiblities" className="text-2xl font-bold">
            Responsiblities
          </h2>
          <p>
            We rely on volunteers for all PNW Cubing competitions. If you are
            competing, we will be asking that you help out in at least one group
            for every round you compete in. You will get these assignments at
            the start of the day on a nametag you will get during check-in.
            Weapos;ll most likely ask you to judge or run. Judging is very easy
            and we are always happy to teach you!
          </p>
          <p>
            We will need much help later in the day during our final rounds of
            events. Spectators are encouraged to learn how to judge; you do not
            need to know how to cube in order to be a judge. Having enough
            judges ensures that we stay on schedule and are able to leave on
            time.
          </p>
          <p>
            If we assign you to judge, run, or scramble, we ask that you fulfill
            these assignments throughout the day so that the competition can
            stay on time and everyone can have fun. if you are not able to make
            it to certain assignments, please let a delegate know, we&apos;re
            always happy to accomodate. If you have any questions or concerns,
            please reach out to us!
          </p>
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full space-y-4">
          <h2 id="nametag" className="text-2xl font-bold w-full">
            Nametags
          </h2>
          <p>
            Upon checking in, you will receive a nametag and lanyard for holding
            your nametag. Your nametag will contain a lot of very important
            information that will help guide you through your day as a
            competitor. While the exact nametag you receive will differ from the
            one shown below, the general format and information should be
            similar.
          </p>
          <div className="flex flex-col sm:gap-2 w-full">
            <div className="col-span-1 md:space-x-12 space-y-2 flex flex-col md:flex-row">
              <Image
                src="/images/nametag_front.png"
                alt="Nametag Front"
                width={240}
                height={480}
              />
              <div className="p-2">
                <p>On the front, we see:</p>
                <ul>
                  <li>
                    The competitor&apos;s name is <b>Chris Tabar</b>
                  </li>
                  <li>
                    The competitor&apos;s WCA ID is <b>2017TABA02</b>
                  </li>
                  <li>
                    The competitor&apos;s ID # for the competition is <b>1</b>
                  </li>
                </ul>
                <p>
                  The competitor ID is an important piece of information. It
                  will be used as your signature when approving your solve
                  times, when judging, and when scrambling.
                </p>
              </div>
            </div>
            <div className="col-span-1 md:space-x-12 space-y-2 flex flex-col md:flex-row">
              <Image
                src="/images/nametag_back.png"
                alt="Nametag Back"
                width={240}
                height={480}
                className="h-[480px]"
              />
              <div className="p-2">
                <p>On the back, we see:</p>
                <ul>
                  <li className="list-item list-disc">
                    <b>Event</b> - the actual event, such as 3x3, 2x2, etc.
                    Compete
                  </li>
                  <li className="list-item list-disc">
                    <b>Compete</b>- This is the one you care about most! The
                    information in this column tells you which stage or room
                    you&apos;re competing in and which group, usually with the
                    first letter of the name of the stage or room, such as (B)
                    for Blue. If the competition has only one stage or room,
                    there may just be a number in this column.
                  </li>
                  <li className="list-item list-disc">
                    <b>Help</b> - This column tells you when you are assigned to
                    a job helping with the competition. The first letter tells
                    you the job you&apos;ll be doing - (J) for Judging, (R) for
                    Running, (S) for Scrambling, the number tells you which
                    group you&apos;ll be helping with.
                  </li>
                </ul>
                <p>For example:</p>
                <p>
                  In the first column, If you see <b>B</b>1, then you are
                  competing on the blue stage for group 1.
                  <br />
                  If you see a <b>J</b>2, this means you are judging for group 2
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-secondary bg-opacity-80">
        <div className="flex flex-col md:w-2/3 w-full space-y-4">
          <h2 id="FAQ" className="text-2xl font-bold">
            Resources
          </h2>
          <p>
            We use a couple of websites to help us communicate information with
            you when you compete at competitions
          </p>
          <ul className="p-2">
            <li className="list-disc">
              <a
                href="https://www.competitiongroups.com/"
                target="_blank"
                className="text-blue-500 underline"
              >
                Competition Groups
              </a>{" "}
              - Our website for communicating groups information like an
              advanced version of your nametag that updates as the competition
              progresses
            </li>

            <li className="list-disc">
              <a
                href="https://live.worldcubeassociation.org/"
                target="_blank"
                className="text-blue-500 underline"
              >
                WCA-Live
              </a>{" "}
              - A website where you can view your results for each competition
              as they come in.
            </li>
          </ul>
        </div>
      </section>
      <section className="flex justify-center w-full px-4 space-y-4 py-4 bg-white">
        <div className="flex flex-col md:w-2/3 w-full space-y-4">
          <h2 id="FAQ" className="text-2xl font-bold">
            Frequently Asked Questions
          </h2>
          <FAQ />
        </div>
      </section>
    </main>
  );
}
