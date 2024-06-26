"use client";

import { Accordion } from "flowbite-react";

export default function FAQ() {
  return (
    <Accordion>
      <Accordion.Panel>
        <Accordion.Title>Do I use my own cube to compete?</Accordion.Title>
        <Accordion.Content>
          <p>
            Yes! You are responsible for your own hardware in order to compete.
            Please refer to section 3 of the WCA Regulations for more
            information on what puzzles are okay to use in competition. If you
            have any questions, please reach out!
          </p>
        </Accordion.Content>
      </Accordion.Panel>
      <Accordion.Panel>
        <Accordion.Title>What is the competition like?</Accordion.Title>
        <Accordion.Content>
          <p>
            Competitions are a ton of fun! Competitions are a great opportuity
            to meet new cubers, make new friends, and be able to compete and get
            official times recognized by the World Cube Association.
            Competitions can be as social of an event as you would like them to
            be. The communitiy is extremely welcoming and you can always sit at
            any table and strike up a conversation with another cuber. They are
            great places to try new cubes as well, just in case you are looking
            to get a new main cube! Once you walk into the venue, you will most
            likely see your nametag at a check-in table. If you are a
            first-timer, you will be asked to verify your information on your
            registration (name, DOB, country). Once you grab your nametag, go
            ahead and find a seat and start cubing! There will be a
            competitor/judge tutorial, which can be found on the schedule. After
            that, we will begin with the first event and will be calling events
            up by group. Your group numbers can be found on the back of your
            nametag. After you compete in an event, you will most likely also be
            expected to help judge another group (typically the following
            group). Competitions are very self-sufficient, so we rely heavily on
            the assitance from other cubers and parents like you! Your assisgned
            helping groups should also be listed on the back of your nametag.
            Once you are done competing in your event, you can go back to your
            table and continnue to socialize! To see if you made it to the next
            round of an event, you can check your results.
          </p>
        </Accordion.Content>
      </Accordion.Panel>
      <Accordion.Panel>
        <Accordion.Title>How do I find results?</Accordion.Title>
        <Accordion.Content>
          For the day of competing, WCA Live will have all of the results
          manually entered throughout the day. Once on WCA Live, scroll to the
          competition in question and you&apos;re good to go! After the
          competition, official results will be posted typically within a few
          days to a week after the competition happens. Q: How do I get a WCA
          ID? After official results are posted after the competitions (see
          question above), you will receive an email with information on your
          WCA ID.
        </Accordion.Content>
      </Accordion.Panel>
      <Accordion.Panel>
        <Accordion.Title>
          Why am I not on the registration list yet?
        </Accordion.Title>
        <Accordion.Content>
          <p>
            Make sure you pay you registration fee in order to be eligible to be
            placed on the competitor list. If the competitor limit has been
            reached by the time your registration is completed, you will be
            placed onto a waitlist, which is listed in the order of when
            competitors pay. If you are not advanced from the waitlist before
            the waittlist closes (date found on Register tab), you will be
            issued a full refund.
          </p>
        </Accordion.Content>
      </Accordion.Panel>
      <Accordion.Panel>
        <Accordion.Title>
          What is the typical age of competitors at these events?
        </Accordion.Title>
        <Accordion.Content>
          <p>
            All ages are welcome, but in general competitors are between 10 and
            20 years old. Don&apos;t let this stop you though! Everyone can and
            should cube!
          </p>
        </Accordion.Content>
      </Accordion.Panel>
      <Accordion.Panel>
        <Accordion.Title>Are there age divisions? </Accordion.Title>
        <Accordion.Content>
          <p>Nope! All cometitors compete in the same groups.</p>
        </Accordion.Content>
      </Accordion.Panel>
      <Accordion.Panel>
        <Accordion.Title>
          Is there anything else I should know before attending my first
          competition?
        </Accordion.Title>
        <Accordion.Content>
          <p>
            Yes! Attending your first competition can come with a lot of nerves,
            so try and focus on having fun and meeting new people. If you
            aren&apos;t as fast as Max Park or Feliks Zemdegs, just remember
            that all cubers faster than you have been at your speed at some
            point! I also point people to
            <a
              href="https://www.worldcubeassociation.org/persons/2007VALK01"
              target="_blank"
            >
              Mats Valk&apos;s WCA Profile
            </a>
            since he started competing whe he averaged well over a minute and
            now averages 6-7 seconds. People often do slightly worse in
            competition than at home too, so don&apos;t beat yourself up if you
            don&apos;t do as well as you had hoped! Once you lock in your first
            set of results, you&apos;ll have new personal records to break and
            goals to achieve at every new competition! If you plan on bringing
            any of your own puzzles, we highly rercommend marking them somehow
            (sharpie mark under a center cap or something similar) or keeping
            them in a box/bag. It happens far too often that many cubers bring a
            bunch of puzzles, put them on a table unattended, and accidentally
            take someone elses&apos; puzzle, thinking it was theirs. It&apos;s
            easy to lose track of a single puzzle, especially since so many of
            them look the same at first glance!
          </p>
        </Accordion.Content>
      </Accordion.Panel>
    </Accordion>
  );
}
