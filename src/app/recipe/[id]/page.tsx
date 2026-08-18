"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Recipe = {
  id: number;
  title: string;
  description: string;
  cooking_time: number;
  servings: number;
  difficulty: string;
  image_url: string | null;
};

type Ingredient = {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  sort_order: number;
};

export default function RecipeDetailsPage() {
  const params = useParams();
  const recipeId = Number(params.id);

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecipe() {
      if (!Number.isInteger(recipeId) || recipeId <= 0) {
        setError("Invalid recipe.");
        setLoading(false);
        return;
      }

      const { data: recipeData, error: recipeError } =
        await supabase
          .from("recipes")
          .select(
            "id, title, description, cooking_time, servings, difficulty, image_url"
          )
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

      const { data: ingredientData, error: ingredientError } =
        await supabase
          .from("ingredients")
          .select("id, name, quantity, unit, sort_order")
          .eq("recipe_id", recipeId)
          .order("sort_order", { ascending: true });

      if (ingredientError) {
        setError(ingredientError.message);
        setLoading(false);
        return;
      }

      setRecipe(recipeData);
      setIngredients(ingredientData ?? []);
      setLoading(false);
    }

    loadRecipe();
  }, [recipeId]);

  const formatQuantity = (quantity: number | null) => {
    if (quantity === null) {
      return "";
    }

    return Number.isInteger(quantity)
      ? quantity.toString()
      : quantity.toString();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex justify-center">
        <div className="min-h-screen w-full max-w-[430px] bg-white p-6">
          <p className="pt-10 text-center text-gray-500">
            Loading recipe...
          </p>
        </div>
      </main>
    );
  }

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
                Unable to display recipe
              </h1>

              <p className="mt-2 text-sm text-red-700">
                {error ?? "Recipe not found."}
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

        {/* Header */}
        <header className="flex items-center justify-between px-6 pt-10 pb-5">
          <Link
            href="/"
            className="text-2xl text-gray-900"
            aria-label="Back to home"
          >
            ←
          </Link>

          <h1 className="font-semibold text-gray-900">
            Recipe Details
          </h1>

          <button
            type="button"
            className="text-2xl text-gray-700"
            aria-label="Add recipe to favorites"
          >
            ♡
          </button>
        </header>

        <div className="flex-1 px-6 pb-28">

          {/* Recipe Image */}
          <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-3xl bg-gray-100">
            {recipe.image_url ? (
                <div className="relative h-[220px] w-full">
                    <Image
                        src={recipe.image_url}
                        alt={recipe.title}
                        fill
                        sizes="(max-width: 430px) 100vw, 430px"
                        className="object-cover"
                    />
                </div>
            ) : (
              <div className="text-center">
                <span
                  className="text-6xl"
                  aria-hidden="true"
                >
                  🍽️
                </span>

                <p className="mt-3 text-sm text-gray-500">
                  Recipe image coming soon
                </p>
              </div>
            )}
          </div>

          {/* Recipe Information */}
          <section className="mt-7">
            <h2 className="text-3xl font-bold text-gray-900">
              {recipe.title}
            </h2>

            <p className="mt-2 leading-6 text-gray-500">
              {recipe.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
              <span>
                ⏱ {recipe.cooking_time} min
              </span>

              <span>
                👤 {recipe.servings} servings
              </span>

              <span>
                ★ {recipe.difficulty}
              </span>
            </div>
          </section>

          {/* Ingredients */}
          <section className="mt-9">
            <h2 className="text-xl font-bold text-gray-900">
              Ingredients
            </h2>

            {ingredients.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {ingredients.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    className="flex items-start gap-2 text-gray-700"
                  >
                    <span aria-hidden="true">•</span>

                    <span>
                      {formatQuantity(ingredient.quantity)}
                      {ingredient.unit
                        ? ` ${ingredient.unit}`
                        : ""}
                      {ingredient.quantity !== null
                        ? " "
                        : ""}
                      {ingredient.name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-gray-500">
                No ingredients are available for this recipe.
              </p>
            )}
          </section>

          {/* Preparation Note */}
          <section className="mt-9 rounded-2xl bg-gray-50 p-5">
            <h2 className="font-bold text-gray-900">
              Before you start
            </h2>

            <p className="mt-1 text-sm leading-5 text-gray-600">
              Make sure all ingredients are prepared and your
              device is positioned where you can easily see and
              hear Cook Assist.
            </p>
          </section>
        </div>

        {/* Start Cooking */}
        <div className="fixed bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 border-t border-gray-200 bg-white p-6">
          <Link
            href={`/cooking/${recipe.id}`}
            className="flex w-full items-center justify-center rounded-2xl bg-gray-900 px-5 py-4 font-semibold text-white transition hover:bg-gray-700"
          >
            Start Cooking
          </Link>
        </div>
      </div>
    </main>
  );
}