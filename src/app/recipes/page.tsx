"use client";

import Image from "next/image";
import Link from "next/link";
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

const FAVORITES_STORAGE_KEY = "cook-assist-favorites";

function getStoredFavorites(): number[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);

    if (!storedFavorites) {
      return [];
    }

    const parsedFavorites: unknown = JSON.parse(storedFavorites);

    if (
      Array.isArray(parsedFavorites) &&
      parsedFavorites.every((id) => typeof id === "number")
    ) {
      return parsedFavorites;
    }

    return [];
  } catch {
    localStorage.removeItem(FAVORITES_STORAGE_KEY);
    return [];
  }
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favoriteIds, setFavoriteIds] =
    useState<number[]>(getStoredFavorites);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecipes() {
      const { data, error } = await supabase
        .from("recipes")
        .select(
          "id, title, description, cooking_time, servings, difficulty, image_url"
        )
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setRecipes(data ?? []);
      }

      setLoading(false);
    }

    loadRecipes();
  }, []);

  function toggleFavorite(recipeId: number) {
    setFavoriteIds((currentFavorites) => {
      const isAlreadyFavorite = currentFavorites.includes(recipeId);

      const updatedFavorites = isAlreadyFavorite
        ? currentFavorites.filter((id) => id !== recipeId)
        : [...currentFavorites, recipeId];

      localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(updatedFavorites)
      );

      return updatedFavorites;
    });
  }

  const filteredRecipes = recipes.filter((recipe) => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      recipe.title.toLowerCase().includes(query) ||
      recipe.description.toLowerCase().includes(query) ||
      recipe.difficulty.toLowerCase().includes(query)
    );
  });

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center">
      <div className="min-h-screen w-full max-w-[430px] bg-white flex flex-col">
        <section className="flex-1 px-6 pt-10 pb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Recipes
          </h1>

          <p className="mt-2 text-gray-500">
            Browse all available recipes.
          </p>

          {/* Search */}
          <div className="relative mt-6">
            <label htmlFor="recipe-search" className="sr-only">
              Search recipes
            </label>

            <input
              id="recipe-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search recipes..."
              className="w-full rounded-2xl border border-gray-300 px-5 py-4 pr-12 text-gray-900 outline-none transition focus:border-gray-700"
            />

            <span
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl"
              aria-hidden="true"
            >
              🔍
            </span>
          </div>

          {/* Recipe count */}
          <div className="mt-9 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              All Recipes
            </h2>

            <p className="text-sm text-gray-500">
              {filteredRecipes.length} available
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="mt-6 rounded-3xl bg-gray-50 p-6 text-center">
              <p className="text-gray-500">
                Loading recipes...
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5"
            >
              <p className="font-semibold text-red-800">
                Unable to load recipes
              </p>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* No results */}
          {!loading && !error && filteredRecipes.length === 0 && (
            <div className="mt-6 rounded-3xl bg-gray-50 p-6 text-center">
              <p className="font-semibold text-gray-800">
                No recipes found
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Try a different search.
              </p>
            </div>
          )}

          {/* Recipe cards */}
          {!loading && !error && filteredRecipes.length > 0 && (
            <div className="mt-5 space-y-6">
              {filteredRecipes.map((recipe) => {
                const isFavorite = favoriteIds.includes(recipe.id);

                return (
                  <article
                    key={recipe.id}
                    className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                  >
                    {/* Recipe image */}
                    <div className="relative flex min-h-[190px] items-center justify-center bg-gray-100">
                      {recipe.image_url ? (
                        <div className="relative h-[190px] w-full">
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
                            className="text-5xl"
                            aria-hidden="true"
                          >
                            🍽️
                          </span>

                          <p className="mt-3 text-sm text-gray-500">
                            Recipe image coming soon
                          </p>
                        </div>
                      )}

                      {/* Favorite button */}
                      <button
                        type="button"
                        onClick={() => toggleFavorite(recipe.id)}
                        aria-label={
                          isFavorite
                            ? `Remove ${recipe.title} from favorites`
                            : `Add ${recipe.title} to favorites`
                        }
                        aria-pressed={isFavorite}
                        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl text-gray-900 shadow-md transition hover:scale-105"
                      >
                        <span aria-hidden="true">
                          {isFavorite ? "♥" : "♡"}
                        </span>
                      </button>
                    </div>

                    {/* Recipe information */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          {recipe.title}
                        </h3>

                        {isFavorite && (
                          <span className="shrink-0 text-xs font-semibold text-gray-500">
                            Favorite
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        {recipe.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
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

                      <Link
                        href={`/recipe/${recipe.id}`}
                        className="mt-5 flex w-full items-center justify-center rounded-2xl bg-gray-900 px-5 py-4 font-semibold text-white transition hover:bg-gray-700"
                      >
                        View Recipe
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Navigation */}
        <nav className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between text-xs">
            <Link
              href="/"
              className="text-center text-gray-400 transition hover:text-gray-900"
            >
              <div className="mb-1 text-lg">
                ⌂
              </div>
              Home
            </Link>

            <Link
              href="/recipes"
              className="text-center font-semibold text-gray-900"
            >
              <div className="mb-1 text-lg">
                ▤
              </div>
              Recipes
            </Link>

            <Link
              href="/favorites"
              className="text-center text-gray-400 transition hover:text-gray-900"
            >
              <div className="mb-1 text-lg">
                ♡
              </div>
              Favorites
            </Link>

            <div className="text-center text-gray-400">
              <div className="mb-1 text-lg">
                ♙
              </div>
              Profile
            </div>
          </div>
        </nav>
      </div>
    </main>
  );
}