"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const steps = [
  {
    instruction: "Cut the chicken breast into thin slices.",
    icon: "🔪",
  },
  {
    instruction: "Heat 1 tablespoon of oil in a large pan over medium heat.",
    icon: "🍳",
  },
  {
    instruction: "Add the chicken and cook for 5 minutes.",
    icon: "🍗",
  },
  {
    instruction: "Add the vegetables and stir well.",
    icon: "🥦",
  },
  {
    instruction: "Add the soy sauce and garlic, then mix everything together.",
    icon: "🥣",
  },
  {
    instruction: "Cook for another 2 minutes, then remove from heat and serve.",
    icon: "🍽️",
  },
];

export default function CookingPage() {
  const [currentStep, setCurrentStep] = useState(0);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(10);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerComplete, setTimerComplete] = useState(false);

  // Move to next step
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((previousStep) => previousStep + 1);
    }
  };

  // Move to previous step
  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((previousStep) => previousStep - 1);
    }
  };

  // Calculate recipe progress
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Read current cooking step aloud
  const speakCurrentStep = () => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const message = new SpeechSynthesisUtterance(
      steps[currentStep].instruction
    );

    message.rate = 0.9;
    message.pitch = 1;
    message.volume = 1;

    window.speechSynthesis.speak(message);
  };

  // Timer countdown
  useEffect(() => {
    if (!timerRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previousTime) => {
        if (previousTime <= 1) {
          window.clearInterval(timer);

          // Run completion actions after this state update finishes
          window.setTimeout(() => {
            setTimerRunning(false);
            setTimerComplete(true);

            if ("speechSynthesis" in window) {
              window.speechSynthesis.cancel();

              const message = new SpeechSynthesisUtterance(
                "Timer complete. Your chicken is ready for the next step."
              );

              message.rate = 0.9;
              message.pitch = 1;
              message.volume = 1;

              window.speechSynthesis.speak(message);
            }
          }, 100);

          return 0;
        }

        return previousTime - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [timerRunning]);

  // Start or resume timer
  const startTimer = () => {
    // If timer finished previously, start a fresh demo timer
    if (timeLeft === 0 || timerComplete) {
      setTimeLeft(10);
    }

    setTimerComplete(false);
    setTimerRunning(true);
  };

  // Pause timer
  const stopTimer = () => {
    setTimerRunning(false);
  };

  // Reset timer
  const resetTimer = () => {
    setTimerRunning(false);
    setTimerComplete(false);
    setTimeLeft(10);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center">
      <div className="min-h-screen w-full max-w-[430px] bg-white flex flex-col">

        {/* Header */}
        <header className="flex items-center justify-between px-6 pt-10 pb-5">
          <Link
            href="/recipe"
            className="text-2xl text-gray-900"
            aria-label="Back to recipe"
          >
            ←
          </Link>

          <p className="font-semibold text-gray-900">
            Step {currentStep + 1} of {steps.length}
          </p>

          <button
            className="text-xl text-gray-700"
            aria-label="Settings"
          >
            ⚙
          </button>
        </header>

        {/* Progress */}
        <section className="px-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gray-900 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-2 text-right text-xs text-gray-500">
            {Math.round(progress)}% complete
          </p>
        </section>

        {/* Current Cooking Step */}
        <section className="flex flex-1 flex-col px-6 pt-8">
          <div className="flex min-h-[220px] items-center justify-center rounded-3xl bg-gray-100">
            <span className="text-8xl">
              {steps[currentStep].icon}
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center py-8">
            <h1 className="text-center text-3xl font-semibold leading-relaxed text-gray-900">
              {steps[currentStep].instruction}
            </h1>
          </div>
        </section>

        {/* Integrated Timer - Step 3 */}
        {currentStep === 2 && (
          <section className="mx-6 mb-6 rounded-3xl border border-gray-200 bg-gray-50 p-5">

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Cooking Timer
                </p>

                <p className="mt-1 text-4xl font-bold text-gray-900">
                  00:{timeLeft.toString().padStart(2, "0")}
                </p>
              </div>

              <span className="text-4xl">
                ⏱️
              </span>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Prototype demo timer — represents the 5 minute cooking timer.
            </p>

            {/* Timer Complete Message */}
            {timerComplete && (
              <div className="mt-4 rounded-xl bg-gray-900 p-4 text-center text-white">
                <p className="font-semibold">
                  ✓ Timer Complete!
                </p>

                <p className="mt-1 text-xs text-gray-300">
                  Your chicken is ready for the next step.
                </p>
              </div>
            )}

            {/* Timer Controls */}
            <div className="mt-4 flex gap-2">

              {!timerRunning ? (
                <button
                  onClick={startTimer}
                  className="flex-1 rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white transition hover:bg-gray-700"
                >
                  {timeLeft < 10 && timeLeft > 0
                    ? "▶ Resume"
                    : "▶ Start Timer"}
                </button>
              ) : (
                <button
                  onClick={stopTimer}
                  className="flex-1 rounded-xl bg-gray-700 px-4 py-3 font-semibold text-white transition hover:bg-gray-600"
                >
                  ⏸ Pause
                </button>
              )}

              <button
                onClick={resetTimer}
                className="rounded-xl bg-gray-200 px-4 py-3 font-semibold text-gray-800 transition hover:bg-gray-300"
              >
                ↻ Reset
              </button>

            </div>
          </section>
        )}

        {/* Hands-Free Controls */}
        <section className="px-6 pb-5">

          <p className="mb-4 text-center text-sm text-gray-500">
            Use the controls below or try a voice command
          </p>

          <div className="flex items-center justify-between">

            {/* Previous Step */}
            <button
              onClick={previousStep}
              disabled={currentStep === 0}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-2xl font-bold text-white shadow-md transition hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
              aria-label="Previous step"
            >
              ←
            </button>

            {/* Voice Command */}
            <button
              className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition hover:bg-gray-700"
              aria-label="Voice command"
            >
              <span className="text-2xl">
                🎙
              </span>

              <span className="mt-1 text-[10px]">
                VOICE
              </span>
            </button>

            {/* Next Step */}
            {currentStep === steps.length - 1 ? (
                <Link
                    href="/complete"
                    className="flex h-14 items-center justify-center rounded-full bg-gray-900 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-gray-700"
                >
                    Finish ✓
                </Link>
                ) : (
                <button
                    onClick={nextStep}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-2xl font-bold text-white shadow-md transition hover:bg-gray-700"
                    aria-label="Next step"
                >
                    →
                </button>
            )}

          </div>

          {/* Repeat Step */}
          <div className="mt-5 flex justify-center">
            <button
              onClick={speakCurrentStep}
              className="rounded-xl bg-gray-200 px-6 py-3 font-medium text-gray-800 transition hover:bg-gray-300"
            >
              🔊 Repeat Step
            </button>
          </div>

        </section>

        {/* Voice Suggestions */}
        <section className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <p className="text-center text-xs text-gray-500">
            Try saying: &quot;Next Step&quot; ·
            &quot; Repeat Step&quot; ·
            &quot; Start Timer&quot;
          </p>
        </section>

      </div>
    </main>
  );
}