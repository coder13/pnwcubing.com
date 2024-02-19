import { LandingPageCards } from "@/components/LandingPage/Cards";

export default function Home() {
  return (
    <main className="">
      <div
        style={{
          background: "url(/images/landing.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.7,
          width: "100vw",
          height: "calc(100vh - 5em)",
        }}
        className="flex flex-col items-center justify-center"
      >
        <div className="flex flex-col drop-shadow-md text-white text-center">
          <h1
            className="text-7xl"
            style={{
              textShadow:
                "2px 2px 4px rgba(0, 0, 0, 0.5)" /* Optional text shadow for better readability */,
            }}
          >
            Pacific Northwest Cubing
          </h1>
          <p
            className="text-xl"
            style={{
              textShadow:
                "2px 2px 4px rgba(0, 0, 0, 0.5)" /* Optional text shadow for better readability */,
            }}
          >
            Welcome to the home of the Pacific Northwest Cubing Community!
          </p>
        </div>
        <LandingPageCards />
      </div>
    </main>
  );
}
