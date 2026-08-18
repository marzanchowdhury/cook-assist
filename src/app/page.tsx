import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 flex justify-center">
      <div className="min-h-screen w-full max-w-[430px] bg-white flex flex-col">
        
        {/* Header */}
        <header className="px-6 pt-10 pb-5">
          <p className="text-sm text-gray-500">Good afternoon</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">
            Cook Assist
          </h1>
          <p className="text-gray-500 mt-2">
            What would you like to cook today?
          </p>
        </header>

        {/* Main Content */}
        <section className="flex-1 px-6">
          
          {/* Search */}
          <div className="relative mb-8">
            <input
              type="text"
              placeholder="Search recipes..."
              className="w-full rounded-2xl border border-gray-300 px-5 py-4 pr-12 text-gray-900 outline-none focus:border-gray-500"
            />

            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl">
              🔍
            </span>
          </div>

          {/* Popular Recipes */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Popular Recipes
            </h2>

            <button className="text-sm text-gray-500">
              See all
            </button>
          </div>

          {/* Chicken Stir-Fry Card */}
          <div className="border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="h-48 bg-gray-200 flex items-center justify-center">
              <span className="text-6xl">🍳</span>
            </div>

            <div className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Chicken Stir-Fry
                  </h3>

                  <p className="text-gray-500 text-sm mt-1">
                    Quick and easy weeknight meal
                  </p>
                </div>

                <button className="text-2xl">
                  ♡
                </button>
              </div>

              <div className="flex gap-5 mt-5 text-sm text-gray-600">
                <span>⏱ 25 min</span>
                <span>👤 2 servings</span>
                <span>★ Easy</span>
              </div>

              <Link
                href="/recipe"
                className="mt-5 block w-full rounded-2xl bg-gray-900 py-4 text-center font-semibold text-white"
              >
                View Recipe
              </Link>
            </div>
          </div>
        </section>

        {/* Bottom Navigation */}
        <nav className="sticky bottom-0 mt-8 border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex justify-between">
            
            <button className="flex flex-col items-center gap-1 text-gray-900">
              <span className="text-xl">⌂</span>
              <span className="text-xs font-semibold">Home</span>
            </button>

            <button className="flex flex-col items-center gap-1 text-gray-400">
              <span className="text-xl">▤</span>
              <span className="text-xs">Recipes</span>
            </button>

            <button className="flex flex-col items-center gap-1 text-gray-400">
              <span className="text-xl">♡</span>
              <span className="text-xs">Favorites</span>
            </button>

            <button className="flex flex-col items-center gap-1 text-gray-400">
              <span className="text-xl">♙</span>
              <span className="text-xs">Profile</span>
            </button>

          </div>
        </nav>
      </div>
    </main>
  );
}