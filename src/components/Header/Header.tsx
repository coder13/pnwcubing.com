import Image from "next/image";
// const pnwSmallIcon = "../../public/small.svg";

const navItems = [
  {
    href: "/competitions/",
    title: "Competitions",
  },
  {
    href: "/delegates/",
    title: "Delegates",
  },
];

export default function Header() {
  return (
    <header className="bg-white">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-center">
          <div className="hidden md:block">
            <nav aria-label="Global">
              <ul className="flex items-center gap-6 text-sm">
                <a className="block text-teal-600" href="/">
                  <span className="sr-only">Home</span>
                  <Image
                    priority
                    src={"/full.svg"}
                    alt="Pacific Northwest Cubing Logo"
                    width={200}
                    height={120}
                  />
                </a>
                {navItems.map((nav) => (
                  <li key={nav.href}>
                    <a
                      className="text-gray-500 transition hover:text-gray-500/75"
                      href={nav.href}
                    >
                      {nav.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="items-center md:hidden flex flex-row">
              <a className="block text-teal-600" href="/">
                <span className="sr-only">Home</span>
                <Image
                  priority
                  src={"/full.svg"}
                  alt="Pacific Northwest Cubing Logo"
                  width={200}
                  height={120}
                />
              </a>
              <button className="rounded bg-gray-100 p-2 text-gray-600 transition hover:text-gray-600/75">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
