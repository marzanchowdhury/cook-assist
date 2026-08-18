import Link from "next/link";

export default function RecipePage() {
  return (
    <main className="min-h-screen bg-gray-100 flex justify-center">
      <div className="min-h-screen w-full max-w-[430px] bg-white flex flex-col">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 pt-10 pb-5">
          <Link
            href="/"
            className="text-2xl text-gray-900"
            aria-label="Back to home"
          >
            ←
          </Link>

          <h1 className="text-lg font-semibold text-gray-900">
            Recipe Details
          </h1>

          <button className="text-2xl text-gray-900" aria-label="Favorite">
            ♡
          </button>
        </header>

        {/* Recipe Image */}
        <section className="px-6">
          <div className="h-56 rounded-3xl bg-gray-200 flex items-center justify-center">
            <span className="text-7xl">🍳</span>
          </div>
        </section>

        {/* Recipe Information */}
        <section className="flex-1 px-6 pt-6 pb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Chicken Stir-Fry
          </h2>

          <p className="mt-2 text-gray-500">
            A quick and easy chicken stir-fry with vegetables and a simple
            savory sauce.
          </p>

          {/* Recipe Stats */}
          <div className="mt-5 flex gap-5 text-sm text-gray-600">
            <span>⏱ 25 min</span>
            <span>👤 2 servings</span>
            <span>★ Easy</span>
          </div>

          {/* Ingredients */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-900">
              Ingredients
            </h3>

            <ul className="mt-4 space-y-3 text-gray-700">
              <li>• 200 g chicken breast</li>
              <li>• 1 bell pepper</li>
              <li>• 1 cup broccoli</li>
              <li>• 2 tbsp soy sauce</li>
              <li>• 1 tbsp cooking oil</li>
              <li>• 1 clove garlic</li>
            </ul>
          </div>

          {/* Preparation Note */}
          <div className="mt-8 rounded-2xl bg-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-900">
              Before you start
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Make sure all ingredients are prepared and your phone is
              positioned where you can easily see and hear Cook Assist.
            </p>
          </div>
        </section>

        {/* Start Cooking */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-5">
          <Link
            href="/cooking"
            className="block w-full rounded-2xl bg-gray-900 py-4 text-center font-semibold text-white transition hover:bg-gray-700"
          >
            Start Cooking
          </Link>
        </div>
      </div>
    </main>
  );
}