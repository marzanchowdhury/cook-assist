"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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

type VoiceStatus =
  | "idle"
  | "listening"
  | "success"
  | "error"
  | "unsupported";

export default function CookingPage() {
  const params = useParams();
  const recipeId = Number(params.id);

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerComplete, setTimerComplete] = useState(false);

  // Voice recognition state
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [voiceStatus, setVoiceStatus] =
    useState<VoiceStatus>("idle");
  const [heardCommand, setHeardCommand] = useState("");
  const [voiceMessage, setVoiceMessage] = useState(
    "Tap the microphone and speak a command."
  );

  // Stores the active browser speech-recognition session.
  const recognitionRef =
    useRef<SpeechRecognition | null>(null);

  /*
   * When Repeat Step is recognized, we wait until speech
   * recognition fully ends before starting text-to-speech.
   */
  const repeatAfterRecognitionRef = useRef(false);

  /*
   * Load the selected recipe and cooking steps from Supabase.
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
          .order("step_number", {
            ascending: true,
          });

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
   * Reset the timer whenever the cooking step changes.
   */
  useEffect(() => {
    const timerSeconds =
      currentStep?.timer_seconds ?? null;

    const resetTimerForStep = window.setTimeout(() => {
      setTimerRunning(false);
      setTimerComplete(false);
      setTimeLeft(timerSeconds);
    }, 0);

    return () => {
      window.clearTimeout(resetTimerForStep);
    };
  }, [currentStep]);

  /*
   * Timer countdown.
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
  const nextStep = useCallback(() => {
    setCurrentStepIndex((previousIndex) => {
      if (previousIndex < steps.length - 1) {
        return previousIndex + 1;
      }

      return previousIndex;
    });
  }, [steps.length]);

  /*
   * Move to the previous cooking step.
   */
  const previousStep = useCallback(() => {
    setCurrentStepIndex((previousIndex) => {
      if (previousIndex > 0) {
        return previousIndex - 1;
      }

      return previousIndex;
    });
  }, []);

  /*
   * Read the current instruction aloud.
   */
  const speakCurrentStep = useCallback(() => {
    const step = steps[currentStepIndex];

    if (
      !step ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const message = new SpeechSynthesisUtterance(
      step.instruction
    );

    message.rate = 0.9;
    message.pitch = 1;
    message.volume = 1;

    window.speechSynthesis.speak(message);
  }, [steps, currentStepIndex]);

  /*
   * Start or resume the current cooking timer.
   */
  const startTimer = useCallback(() => {
    const step = steps[currentStepIndex];

    if (!step?.timer_seconds) {
      setVoiceStatus("error");
      setVoiceMessage(
        "There is no timer for the current step."
      );
      return;
    }

    setTimeLeft((previousTime) => {
      if (
        previousTime === null ||
        previousTime === 0
      ) {
        return step.timer_seconds;
      }

      return previousTime;
    });

    setTimerComplete(false);
    setTimerRunning(true);
  }, [steps, currentStepIndex]);

  /*
   * Pause the active timer.
   */
  const pauseTimer = useCallback(() => {
    setTimerRunning(false);
  }, []);

  /*
   * Reset the current timer.
   */
  const resetTimer = useCallback(() => {
    const step = steps[currentStepIndex];

    if (!step?.timer_seconds) {
      setVoiceStatus("error");
      setVoiceMessage(
        "There is no timer for the current step."
      );
      return;
    }

    setTimerRunning(false);
    setTimerComplete(false);
    setTimeLeft(step.timer_seconds);
  }, [steps, currentStepIndex]);

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
   * Process a recognized voice command.
   */
  const processVoiceCommand = useCallback(
    (transcript: string) => {
      const command = transcript
        .toLowerCase()
        .trim()
        .replace(/[.,!?]/g, "");

      setHeardCommand(transcript);

      /*
       * NEXT STEP
       */
      if (
        command.includes("next step") ||
        command === "next"
      ) {
        if (
          currentStepIndex >=
          steps.length - 1
        ) {
          setVoiceStatus("error");
          setVoiceMessage(
            "You are already on the final step."
          );
          return;
        }

        nextStep();

        setVoiceStatus("success");
        setVoiceMessage(
          "Moving to the next step."
        );

        return;
      }

      /*
       * PREVIOUS STEP
       */
      if (
        command.includes("previous step") ||
        command.includes("go back") ||
        command === "previous" ||
        command === "back"
      ) {
        if (currentStepIndex === 0) {
          setVoiceStatus("error");
          setVoiceMessage(
            "You are already on the first step."
          );
          return;
        }

        previousStep();

        setVoiceStatus("success");
        setVoiceMessage(
          "Moving to the previous step."
        );

        return;
      }

      /*
       * REPEAT STEP
       *
       * Do not speak immediately. The recognition session
       * may still own the browser audio input/output path.
       * Instead, queue the instruction for recognition.onend.
       */
      if (
        command.includes("repeat step") ||
        command.includes("repeat instruction") ||
        command === "repeat"
      ) {
        repeatAfterRecognitionRef.current = true;

        setVoiceStatus("success");
        setVoiceMessage(
          "Repeating the current instruction."
        );

        return;
      }

      /*
       * START / RESUME TIMER
       */
      if (
        command.includes("start timer") ||
        command.includes("resume timer")
      ) {
        const step = steps[currentStepIndex];

        if (!step?.timer_seconds) {
          setVoiceStatus("error");
          setVoiceMessage(
            "There is no timer for the current step."
          );
          return;
        }

        startTimer();

        setVoiceStatus("success");
        setVoiceMessage("Timer started.");

        return;
      }

      /*
       * PAUSE / STOP TIMER
       */
      if (
        command.includes("pause timer") ||
        command.includes("stop timer")
      ) {
        if (!timerRunning) {
          setVoiceStatus("error");
          setVoiceMessage(
            "There is no active timer to pause."
          );
          return;
        }

        pauseTimer();

        setVoiceStatus("success");
        setVoiceMessage("Timer paused.");

        return;
      }

      /*
       * RESET TIMER
       */
      if (command.includes("reset timer")) {
        const step = steps[currentStepIndex];

        if (!step?.timer_seconds) {
          setVoiceStatus("error");
          setVoiceMessage(
            "There is no timer for the current step."
          );
          return;
        }

        resetTimer();

        setVoiceStatus("success");
        setVoiceMessage("Timer reset.");

        return;
      }

      /*
       * COMMAND NOT RECOGNIZED
       */
      setVoiceStatus("error");
      setVoiceMessage(
        'Command not recognized. Try "Next Step", "Previous Step", "Repeat Step", or a timer command.'
      );
    },
    [
      currentStepIndex,
      steps,
      timerRunning,
      nextStep,
      previousStep,
      startTimer,
      pauseTimer,
      resetTimer,
    ]
  );

  /*
   * Detect whether the browser supports speech recognition.
   */
  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition ??
      window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      return;
    }

    const updateUnsupportedState =
      window.setTimeout(() => {
        setVoiceSupported(false);
        setVoiceStatus("unsupported");
        setVoiceMessage(
          "Voice commands are not supported in this browser. Manual controls are still available."
        );
      }, 0);

    return () => {
      window.clearTimeout(updateUnsupportedState);
    };
  }, []);

  /*
   * Start listening for one spoken command.
   */
  const startVoiceRecognition = () => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition ??
      window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setVoiceSupported(false);
      setVoiceStatus("unsupported");
      setVoiceMessage(
        "Voice commands are not supported in this browser."
      );
      return;
    }

    /*
     * Stop an existing recognition session before starting
     * another one.
     */
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    /*
     * Clear any queued Repeat Step command.
     */
    repeatAfterRecognitionRef.current = false;

    /*
     * Stop existing speech before opening the microphone so
     * Cook Assist cannot accidentally recognize itself.
     */
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const recognition =
      new SpeechRecognitionAPI();

    recognition.lang = "en-CA";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognitionRef.current = recognition;

    /*
     * Recognition started.
     */
    recognition.onstart = () => {
      setHeardCommand("");
      setVoiceStatus("listening");
      setVoiceMessage("Listening...");
    };

    /*
     * Speech recognized.
     */
    recognition.onresult = (
      event: SpeechRecognitionEvent
    ) => {
      const transcript =
        event.results[0]?.[0]?.transcript ?? "";

      if (!transcript) {
        setVoiceStatus("error");
        setVoiceMessage(
          "I could not hear a command. Please try again."
        );
        return;
      }

      processVoiceCommand(transcript);
    };

    /*
     * Handle recognition errors.
     */
    recognition.onerror = (
      event: SpeechRecognitionErrorEvent
    ) => {
      repeatAfterRecognitionRef.current = false;

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        setVoiceStatus("error");
        setVoiceMessage(
          "Microphone permission was denied. Allow microphone access in your browser to use voice commands."
        );
        return;
      }

      if (event.error === "no-speech") {
        setVoiceStatus("error");
        setVoiceMessage(
          "No speech was detected. Tap the microphone and try again."
        );
        return;
      }

      if (event.error === "audio-capture") {
        setVoiceStatus("error");
        setVoiceMessage(
          "No microphone was detected."
        );
        return;
      }

      if (event.error === "aborted") {
        return;
      }

      setVoiceStatus("error");
      setVoiceMessage(
        "Voice recognition was unsuccessful. Please try again."
      );
    };

    /*
     * Recognition has completely ended.
     *
     * If Repeat Step was requested, this is now the safe
     * point to start text-to-speech.
     */
    recognition.onend = () => {
      recognitionRef.current = null;

      if (repeatAfterRecognitionRef.current) {
        repeatAfterRecognitionRef.current = false;

        window.setTimeout(() => {
          speakCurrentStep();
        }, 150);

        return;
      }

      setVoiceStatus((currentStatus) => {
        if (currentStatus === "listening") {
          setVoiceMessage(
            "No command was detected. Tap the microphone to try again."
          );

          return "error";
        }

        return currentStatus;
      });
    };

    /*
     * Start microphone recognition.
     */
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      repeatAfterRecognitionRef.current = false;

      setVoiceStatus("error");
      setVoiceMessage(
        "Voice recognition could not be started. Please try again."
      );
    }
  };

  /*
   * Stop voice services when leaving the cooking page.
   */
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      repeatAfterRecognitionRef.current = false;

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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
   * Calculate recipe progress dynamically.
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

        {/* Cooking Timer */}
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
                    You can continue to the next step.
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

        {/* Voice Commands */}
        <section className="mx-6 mb-6 rounded-3xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={startVoiceRecognition}
              disabled={
                !voiceSupported ||
                voiceStatus === "listening"
              }
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-900 text-2xl text-white shadow-md transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              aria-label="Start voice command"
            >
              {voiceStatus === "listening"
                ? "•••"
                : "🎙"}
            </button>

            <div>
              <h2 className="font-semibold text-gray-900">
                Voice Commands
              </h2>

              <p
                className="mt-1 text-sm text-gray-600"
                aria-live="polite"
              >
                {voiceMessage}
              </p>
            </div>
          </div>

          {/* Recognized Speech */}
          {heardCommand && (
            <div className="mt-4 rounded-xl bg-white p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Heard
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800">
                &quot;{heardCommand}&quot;
              </p>
            </div>
          )}

          {/* Available Commands */}
          <div className="mt-4 border-t border-gray-200 pt-4">
            <p className="text-xs leading-5 text-gray-500">
              Try saying: &quot;Next Step&quot; ·
              &quot; Previous Step&quot; ·
              &quot; Repeat Step&quot; ·
              &quot; Start Timer&quot; ·
              &quot; Pause Timer&quot; ·
              &quot; Reset Timer&quot;
            </p>
          </div>
        </section>

        {/* Manual Controls */}
        <section className="px-6 pb-6">
          <p className="mb-4 text-center text-sm text-gray-500">
            Manual controls
          </p>

          <div className="flex items-center justify-between">

            {/* Previous */}
            <button
              type="button"
              onClick={previousStep}
              disabled={currentStepIndex === 0}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-2xl font-bold text-white shadow-md transition hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
              aria-label="Previous step"
            >
              ←
            </button>

            {/* Repeat */}
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