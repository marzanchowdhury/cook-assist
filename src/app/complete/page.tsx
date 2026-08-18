"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Recipe = {
  id: number;
  title: string;
  image_url: string | null;
};

export default function CompletePage() {
  const searchParams = useSearchParams();
  const recipeId = Number(searchParams.get("recipe"));

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [stepCount, setStepCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /*
   * Load the completed recipe and determine how many
   * cooking steps it contains.
   */
  useEffect(() => {
    async function loadCompletionData() {
      if (!Number.isInteger(recipeId) || recipeId <= 0) {
        setError("Invalid recipe.");
        setLoading(false);
        return;
      }

      const { data: recipeData, error: recipeError } =
        await supabase
          .from("recipes")
          .select("id, title, image_url")
          .eq("id", recipeId)
          .maybeSingle();

      if (recipeError) {
        setError(recipeError.message);
        setLoading(false);
        return;
      }

      if (!recipeData) {
        setError("Recipe not found.");
        setLoading(false);
        return;
      }

      const { count, error: stepError } = await supabase
        .from("recipe_steps")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("recipe_id", recipeId);

      if (stepError) {
        setError(stepError.message);
        setLoading(false);
        return;
      }

      setRecipe(recipeData);
      setStepCount(count ?? 0);
      setLoading(false);
    }

    loadCompletionData();
  }, [recipeId]);

  /*
   * Loading state.
   */
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex justify-center">
        <div className="min-h-screen w-full max-w-[430px] bg-white p-6">
          <p className="pt-10 text-center text-gray-500">
            Loading completion details...
          </p>
        </div>
      </main>
    );
  }

  /*
   * Error state.
   */
  if (error || !recipe) {
    return (
      <main className="min-h-screen bg-gray-100 flex justify-center">
        <div className="min-h-screen w-full max-w-[430px] bg-white p-6">
          <div className="pt-10">
            <Link
              href="/"
              className="text-lg font-medium text-gray-700"
            >
              ← Home
            </Link>

            <div
              role="alert"
              className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-5"
            >
              <h1 className="font-bold text-red-800">
                Unable to display completion details
              </h1>

              <p className="mt-2 text-sm text-red-700">
                {error ?? "Recipe information is unavailable."}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center">
      <div className="min-h-screen w-full max-w-[430px] bg-white flex flex-col">

        {/* Main Content */}
        <section className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">

          {/* Success Icon */}
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-900 text-5xl text-white shadow-lg"
            aria-hidden="true"
          >
            ✓
          </div>

          {/* Completion Message */}
          <h1 className="mt-8 text-3xl font-bold text-gray-900">
            Recipe Complete!
          </h1>

          <p className="mt-3 text-lg text-gray-600">
            Your {recipe.title} is ready.
          </p>

          {/* Recipe Image */}
          <div className="relative mt-8 flex h-48 w-full items-center justify-center overflow-hidden rounded-3xl bg-gray-100">
            {recipe.image_url ? (
              <Image
                src={recipe.image_url}
                alt={recipe.title}
                fill
                sizes="(max-width: 430px) 100vw, 430px"
                className="object-cover"
              />
            ) : (
              <div className="text-center">
                <span
                  className="text-8xl"
                  aria-hidden="true"
                >
                  🍲
                </span>

                <p className="mt-2 text-sm text-gray-500">
                  Meal complete
                </p>
              </div>
            )}
          </div>

          {/* Success Information */}
          <div className="mt-8 w-full rounded-2xl bg-gray-50 p-5">
            <p className="font-semibold text-gray-900">
              Great job!
            </p>

            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              You completed all {stepCount} cooking{" "}
              {stepCount === 1 ? "step" : "steps"} with Cook
              Assist. Enjoy your meal!
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
            href={`/recipe/${recipe.id}`}
            className="mt-3 block w-full rounded-2xl bg-gray-100 py-4 text-center font-semibold text-gray-800 transition hover:bg-gray-200"
          >
            View Recipe Again
          </Link>
        </section>
      </div>
    </main>
  );
}