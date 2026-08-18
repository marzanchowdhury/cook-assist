import Link from "next/link";

export default function CompletePage() {
  return (
    <main className="min-h-screen bg-gray-100 flex justify-center">
      <div className="min-h-screen w-full max-w-[430px] bg-white flex flex-col">

        {/* Main Content */}
        <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">

          {/* Success Icon */}
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-900 text-5xl text-white shadow-lg">
            ✓
          </div>

          {/* Completion Message */}
          <h1 className="mt-8 text-3xl font-bold text-gray-900">
            Recipe Complete!
          </h1>

          <p className="mt-3 text-lg text-gray-600">
            Your Chicken Stir-Fry is ready.
          </p>

          {/* Meal Illustration */}
          <div className="mt-8 flex h-48 w-full items-center justify-center rounded-3xl bg-gray-100">
            <span className="text-8xl">
              🍲
            </span>
          </div>

          {/* Success Information */}
          <div className="mt-8 w-full rounded-2xl bg-gray-50 p-5">
            <p className="font-semibold text-gray-900">
              Great job!
            </p>

            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              You completed all 6 cooking steps with Cook Assist.
              Enjoy your meal!
            </p>
          </div>

        </section>

        {/* Actions */}
        <section className="border-t border-gray-200 px-6 py-6">

          <Link
            href="/"
            className="block w-full rounded-2xl bg-gray-900 py-4 text-center font-semibold text-white transition hover:bg-gray-700"
          >
            Back to Home
          </Link>

          <Link
            href="/recipe"
            className="mt-3 block w-full rounded-2xl bg-gray-100 py-4 text-center font-semibold text-gray-800 transition hover:bg-gray-200"
          >
            View Recipe Again
          </Link>

        </section>

      </div>
    </main>
  );
}