"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Recipe = {
  id: number;
  title: string;
};

type RecipeStep = {
  id: number;
  step_number: number;
  instruction: string;
  image_url: string | null;
  timer_seconds: number | null;
};

export default function CookingPage() {
  const params = useParams();
  const recipeId = Number(params.id);

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerComplete, setTimerComplete] = useState(false);

  /*
   * Load the selected recipe and its cooking steps from Supabase.
   */
  useEffect(() => {
    async function loadCookingData() {
      if (!Number.isInteger(recipeId) || recipeId <= 0) {
        setError("Invalid recipe.");
        setLoading(false);
        return;
      }

      const { data: recipeData, error: recipeError } =
        await supabase
          .from("recipes")
          .select("id, title")
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

      const { data: stepData, error: stepError } =
        await supabase
          .from("recipe_steps")
          .select(
            "id, step_number, instruction, image_url, timer_seconds"
          )
          .eq("recipe_id", recipeId)
          .order("step_number", { ascending: true });

      if (stepError) {
        setError(stepError.message);
        setLoading(false);
        return;
      }

      if (!stepData || stepData.length === 0) {
        setError(
          "No cooking steps are available for this recipe."
        );
        setLoading(false);
        return;
      }

      setRecipe(recipeData);
      setSteps(stepData);
      setLoading(false);
    }

    loadCookingData();
  }, [recipeId]);

  const currentStep = steps[currentStepIndex];

  /*
   * Prepare the timer whenever the user changes cooking steps.
   *
   * The timer value comes directly from the current database step.
   */
  useEffect(() => {
    const timerSeconds = currentStep?.timer_seconds ?? null;

    const resetForCurrentStep = window.setTimeout(() => {
      setTimerRunning(false);
      setTimerComplete(false);
      setTimeLeft(timerSeconds);
    }, 0);

    return () => {
      window.clearTimeout(resetForCurrentStep);
    };
  }, [currentStep]);

  /*
   * Run the cooking timer.
   *
   * Completion is handled inside the timeout callback rather than
   * synchronously inside the effect.
   */
  useEffect(() => {
    if (
      !timerRunning ||
      timeLeft === null ||
      timeLeft <= 0
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setTimeLeft((previousTime) => {
        if (previousTime === null) {
          return null;
        }

        if (previousTime <= 1) {
          setTimerRunning(false);
          setTimerComplete(true);

          if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();

            const message =
              new SpeechSynthesisUtterance(
                "Timer complete. You can continue to the next step."
              );

            message.rate = 0.9;
            message.pitch = 1;
            message.volume = 1;

            window.speechSynthesis.speak(message);
          }

          return 0;
        }

        return previousTime - 1;
      });
    }, 1000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [timerRunning, timeLeft]);

  /*
   * Move to the next cooking step.
   */
  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(
        (previousIndex) => previousIndex + 1
      );
    }
  };

  /*
   * Move to the previous cooking step.
   */
  const previousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(
        (previousIndex) => previousIndex - 1
      );
    }
  };

  /*
   * Read the current instruction aloud using the browser's
   * built-in speech synthesis functionality.
   */
  const speakCurrentStep = () => {
    if (
      !currentStep ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const message = new SpeechSynthesisUtterance(
      currentStep.instruction
    );

    message.rate = 0.9;
    message.pitch = 1;
    message.volume = 1;

    window.speechSynthesis.speak(message);
  };

  /*
   * Start or resume the timer for the current cooking step.
   */
  const startTimer = () => {
    if (
      !currentStep?.timer_seconds ||
      timeLeft === null
    ) {
      return;
    }

    if (timeLeft === 0) {
      setTimeLeft(currentStep.timer_seconds);
    }

    setTimerComplete(false);
    setTimerRunning(true);
  };

  /*
   * Pause the active cooking timer.
   */
  const pauseTimer = () => {
    setTimerRunning(false);
  };

  /*
   * Restore the current step's timer to its original database value.
   */
  const resetTimer = () => {
    if (!currentStep?.timer_seconds) {
      return;
    }

    setTimerRunning(false);
    setTimerComplete(false);
    setTimeLeft(currentStep.timer_seconds);
  };

  /*
   * Convert seconds into MM:SS format.
   */
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes
      .toString()
      .padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  /*
   * Loading state.
   */
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex justify-center">
        <div className="min-h-screen w-full max-w-[430px] bg-white p-6">
          <p className="pt-10 text-center text-gray-500">
            Loading cooking instructions...
          </p>
        </div>
      </main>
    );
  }

  /*
   * Error state.
   */
  if (error || !recipe || !currentStep) {
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
                Unable to start cooking
              </h1>

              <p className="mt-2 text-sm text-red-700">
                {error ??
                  "Cooking instructions are unavailable."}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * Calculate progress dynamically from the number of
   * cooking steps returned by Supabase.
   */
  const progress =
    ((currentStepIndex + 1) / steps.length) * 100;

  const isFinalStep =
    currentStepIndex === steps.length - 1;

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center">
      <div className="min-h-screen w-full max-w-[430px] bg-white flex flex-col">

        {/* Header */}
        <header className="flex items-center justify-between px-6 pt-10 pb-5">
          <Link
            href={`/recipe/${recipe.id}`}
            className="text-2xl text-gray-900"
            aria-label="Back to recipe"
          >
            ←
          </Link>

          <div className="text-center">
            <p className="font-semibold text-gray-900">
              Step {currentStepIndex + 1} of{" "}
              {steps.length}
            </p>

            <p className="text-xs text-gray-500">
              {recipe.title}
            </p>
          </div>

          <span
            className="w-6"
            aria-hidden="true"
          />
        </header>

        {/* Progress */}
        <section className="px-6">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-label="Recipe progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div
              className="h-full rounded-full bg-gray-900 transition-all duration-300"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <p className="mt-2 text-right text-xs text-gray-500">
            {Math.round(progress)}% complete
          </p>
        </section>

        {/* Current Cooking Step */}
        <section className="flex flex-1 flex-col px-6 pt-8">

          {/* Step Image */}
          <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-3xl bg-gray-100">
            {currentStep.image_url ? (
                <div className="relative h-[220px] w-full">
                    <Image
                    src={currentStep.image_url}
                    alt={`Cooking step ${currentStep.step_number}`}
                    fill
                    sizes="(max-width: 430px) 100vw, 430px"
                    className="object-cover"
                    />
                </div>

            ) : (
              <div className="px-8 text-center">
                <span
                  className="text-6xl"
                  aria-hidden="true"
                >
                  🍳
                </span>

                <p className="mt-3 text-sm text-gray-500">
                  Step image coming soon
                </p>
              </div>
            )}
          </div>

          {/* Instruction */}
          <div className="flex flex-1 items-center justify-center py-8">
            <h1 className="text-center text-3xl font-semibold leading-relaxed text-gray-900">
              {currentStep.instruction}
            </h1>
          </div>
        </section>

        {/* Dynamic Cooking Timer */}
        {currentStep.timer_seconds !== null &&
          timeLeft !== null && (
            <section className="mx-6 mb-6 rounded-3xl border border-gray-200 bg-gray-50 p-5">

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Cooking Timer
                  </p>

                  <p
                    className="mt-1 text-4xl font-bold text-gray-900"
                    aria-live="off"
                  >
                    {formatTime(timeLeft)}
                  </p>
                </div>

                <span
                  className="text-4xl"
                  aria-hidden="true"
                >
                  ⏱️
                </span>
              </div>

              {/* Timer Completion Feedback */}
              {timerComplete && (
                <div
                  role="status"
                  aria-live="assertive"
                  className="mt-4 rounded-xl bg-gray-900 p-4 text-center text-white"
                >
                  <p className="font-semibold">
                    ✓ Timer Complete!
                  </p>

                  <p className="mt-1 text-xs text-gray-300">
                    You can continue to the next
                    step.
                  </p>
                </div>
              )}

              {/* Timer Controls */}
              <div className="mt-4 flex gap-2">
                {!timerRunning ? (
                  <button
                    type="button"
                    onClick={startTimer}
                    className="flex-1 rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white transition hover:bg-gray-700"
                  >
                    {timeLeft <
                      currentStep.timer_seconds &&
                    timeLeft > 0
                      ? "▶ Resume"
                      : "▶ Start Timer"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pauseTimer}
                    className="flex-1 rounded-xl bg-gray-700 px-4 py-3 font-semibold text-white transition hover:bg-gray-600"
                  >
                    ⏸ Pause
                  </button>
                )}

                <button
                  type="button"
                  onClick={resetTimer}
                  className="rounded-xl bg-gray-200 px-4 py-3 font-semibold text-gray-800 transition hover:bg-gray-300"
                >
                  ↻ Reset
                </button>
              </div>
            </section>
          )}

        {/* Cooking Controls */}
        <section className="px-6 pb-6">

          <p className="mb-4 text-center text-sm text-gray-500">
            Use the controls below to follow the
            recipe
          </p>

          <div className="flex items-center justify-between">

            {/* Previous Step */}
            <button
              type="button"
              onClick={previousStep}
              disabled={currentStepIndex === 0}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-2xl font-bold text-white shadow-md transition hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
              aria-label="Previous step"
            >
              ←
            </button>

            {/* Repeat Instruction */}
            <button
              type="button"
              onClick={speakCurrentStep}
              className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition hover:bg-gray-700"
              aria-label="Read current step aloud"
            >
              <span
                className="text-2xl"
                aria-hidden="true"
              >
                🔊
              </span>

              <span className="mt-1 text-[10px]">
                REPEAT
              </span>
            </button>

            {/* Next / Finish */}
            {isFinalStep ? (
              <Link
                href={`/complete?recipe=${recipe.id}`}
                className="flex h-14 items-center justify-center rounded-full bg-gray-900 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-gray-700"
              >
                Finish ✓
              </Link>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-2xl font-bold text-white shadow-md transition hover:bg-gray-700"
                aria-label="Next step"
              >
                →
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}