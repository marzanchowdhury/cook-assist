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

  // Voice state
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [voiceStatus, setVoiceStatus] =
    useState<VoiceStatus>("idle");
  const [heardCommand, setHeardCommand] = useState("");
  const [voiceMessage, setVoiceMessage] = useState(
    "Tap the microphone and speak a command."
  );

  // Hands-free mode
  const [handsFreeMode, setHandsFreeMode] = useState(false);

  // Active speech-recognition session
  const recognitionRef =
    useRef<SpeechRecognition | null>(null);

  // Current Hands-Free Mode state
  const handsFreeModeRef = useRef(false);

  // True while Cook Assist is speaking
  const speakingRef = useRef(false);

  // True while speech is scheduled but has not started
  const speechPendingRef = useRef(false);

  // Latest command processor
  const processVoiceCommandRef = useRef<
    ((transcript: string, requireWakePhrase?: boolean) => void) | null
  >(null);

  // Latest recognition starter
  const startVoiceRecognitionRef = useRef<
    ((handsFreeSession?: boolean) => void) | null
  >(null);

  /*
   * Keep hands-free ref synchronized.
   */
  useEffect(() => {
    handsFreeModeRef.current = handsFreeMode;
  }, [handsFreeMode]);

  /*
   * Load recipe and cooking steps.
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
   * Reset timer whenever the cooking step changes.
   */
  useEffect(() => {
    const timerSeconds =
      currentStep?.timer_seconds ?? null;

    const timeout = window.setTimeout(() => {
      setTimerRunning(false);
      setTimerComplete(false);
      setTimeLeft(timerSeconds);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [currentStep]);

  /*
   * Next step.
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
   * Previous step.
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
   * Start or resume timer.
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
   * Pause timer.
   */
  const pauseTimer = useCallback(() => {
    setTimerRunning(false);
  }, []);

  /*
   * Reset timer.
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
   * Format timer as MM:SS.
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
   * Restart Hands-Free Mode after speech has finished.
   *
   * startVoiceRecognition is accessed through a ref,
   * avoiding circular callback dependencies.
   */
  const restartHandsFreeAfterSpeech =
    useCallback(() => {
      if (!handsFreeModeRef.current) {
        return;
      }

      window.setTimeout(() => {
        if (
          handsFreeModeRef.current &&
          !recognitionRef.current &&
          !speakingRef.current &&
          !speechPendingRef.current
        ) {
          startVoiceRecognitionRef.current?.(true);
        }
      }, 400);
    }, []);

  /*
   * Speak text aloud.
   *
   * Once speech finishes, Hands-Free Mode automatically
   * begins listening again.
   */
  const speakText = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) {
        speechPendingRef.current = false;

        if (handsFreeModeRef.current) {
          restartHandsFreeAfterSpeech();
        }

        return;
      }

      speechPendingRef.current = false;
      speakingRef.current = true;

      /*
       * Stop recognition before speaking so Cook Assist
       * does not hear its own voice.
       */
      if (recognitionRef.current) {
        const activeRecognition =
          recognitionRef.current;

        recognitionRef.current = null;

        try {
          activeRecognition.abort();
        } catch {
          // Recognition may already have ended.
        }
      }

      window.speechSynthesis.cancel();

      const message =
        new SpeechSynthesisUtterance(text);

      message.rate = 0.9;
      message.pitch = 1;
      message.volume = 1;

      message.onend = () => {
        speakingRef.current = false;

        if (handsFreeModeRef.current) {
          setVoiceStatus("listening");
          setVoiceMessage(
            'Hands-Free Mode is listening. Say "Cook Assist" followed by a command.'
          );

          restartHandsFreeAfterSpeech();
        }
      };

      message.onerror = () => {
        speakingRef.current = false;

        if (handsFreeModeRef.current) {
          setVoiceStatus("listening");
          setVoiceMessage(
            'Hands-Free Mode is listening. Say "Cook Assist" followed by a command.'
          );

          restartHandsFreeAfterSpeech();
        }
      };

      window.speechSynthesis.speak(message);
    },
    [restartHandsFreeAfterSpeech]
  );

  /*
   * Read the current step aloud.
   */
  const speakCurrentStep = useCallback(() => {
    const step = steps[currentStepIndex];

    if (!step) {
      speechPendingRef.current = false;
      return;
    }

    speakText(step.instruction);
  }, [steps, currentStepIndex, speakText]);

  /*
   * Manual next-step navigation.
   *
   * If Hands-Free Mode is enabled, automatically read
   * the newly displayed step aloud. speakText() will
   * resume hands-free listening when speech finishes.
   */
  const handleManualNextStep = useCallback(() => {
    if (currentStepIndex >= steps.length - 1) {
      return;
    }

    const nextInstruction =
      steps[currentStepIndex + 1]?.instruction;

    nextStep();

    if (
      handsFreeModeRef.current &&
      nextInstruction
    ) {
      speechPendingRef.current = true;

      setVoiceStatus("success");
      setVoiceMessage(
        "Moving to the next step."
      );

      window.setTimeout(() => {
        speakText(nextInstruction);
      }, 250);
    }
  }, [
    currentStepIndex,
    steps,
    nextStep,
    speakText,
  ]);

  /*
   * Manual previous-step navigation.
   *
   * If Hands-Free Mode is enabled, automatically read
   * the newly displayed step aloud. speakText() will
   * resume hands-free listening when speech finishes.
   */
  const handleManualPreviousStep = useCallback(() => {
    if (currentStepIndex <= 0) {
      return;
    }

    const previousInstruction =
      steps[currentStepIndex - 1]?.instruction;

    previousStep();

    if (
      handsFreeModeRef.current &&
      previousInstruction
    ) {
      speechPendingRef.current = true;

      setVoiceStatus("success");
      setVoiceMessage(
        "Moving to the previous step."
      );

      window.setTimeout(() => {
        speakText(previousInstruction);
      }, 250);
    }
  }, [
    currentStepIndex,
    steps,
    previousStep,
    speakText,
  ]);

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

          speechPendingRef.current = true;

          window.setTimeout(() => {
            speakText(
              "Timer complete. You can continue to the next step."
            );
          }, 100);

          return 0;
        }

        return previousTime - 1;
      });
    }, 1000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [timerRunning, timeLeft, speakText]);

  /*
   * Process recognized commands.
   */
  const processVoiceCommand = useCallback(
    (
      transcript: string,
      requireWakePhrase = false
    ) => {
      let command = transcript
        .toLowerCase()
        .trim()
        .replace(/[.,!?]/g, "");

      setHeardCommand(transcript);

      /*
       * Hands-Free Mode requires the wake phrase.
       */
      if (requireWakePhrase) {
        const wakePhrase =
          /\bcook\s+assist\b/;

        if (!wakePhrase.test(command)) {
          setVoiceStatus("listening");
          setVoiceMessage(
            'Hands-Free Mode is listening. Say "Cook Assist" followed by a command.'
          );
          return;
        }

        command = command
          .replace(wakePhrase, "")
          .trim();

        if (!command) {
          setVoiceStatus("listening");
          setVoiceMessage(
            'Say a command after "Cook Assist", such as "Cook Assist, next step."'
          );
          return;
        }
      }

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

        const nextInstruction =
          steps[currentStepIndex + 1]?.instruction;

        if (nextInstruction) {
          speechPendingRef.current = true;
        }

        nextStep();

        setVoiceStatus("success");
        setVoiceMessage(
          "Moving to the next step."
        );

        /*
         * Automatically read the new step.
         */
        if (nextInstruction) {
          window.setTimeout(() => {
            speakText(nextInstruction);
          }, 250);
        }

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

        const previousInstruction =
          steps[currentStepIndex - 1]?.instruction;

        if (previousInstruction) {
          speechPendingRef.current = true;
        }

        previousStep();

        setVoiceStatus("success");
        setVoiceMessage(
          "Moving to the previous step."
        );

        /*
         * Automatically read the previous step.
         */
        if (previousInstruction) {
          window.setTimeout(() => {
            speakText(previousInstruction);
          }, 250);
        }

        return;
      }

      /*
       * REPEAT STEP
       */
      if (
        command.includes("repeat step") ||
        command.includes("repeat instruction") ||
        command === "repeat"
      ) {
        speechPendingRef.current = true;

        setVoiceStatus("success");
        setVoiceMessage(
          "Repeating the current instruction."
        );

        window.setTimeout(() => {
          speakCurrentStep();
        }, 250);

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
       * UNKNOWN COMMAND
       */
      setVoiceStatus("error");

      if (requireWakePhrase) {
        setVoiceMessage(
          'Command not recognized. Try "Cook Assist, next step".'
        );
      } else {
        setVoiceMessage(
          'Command not recognized. Try "Next Step", "Previous Step", "Repeat Step", or a timer command.'
        );
      }
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
      speakText,
      speakCurrentStep,
    ]
  );

  /*
   * Keep the command-processing ref up to date.
   */
  useEffect(() => {
    processVoiceCommandRef.current =
      processVoiceCommand;
  }, [processVoiceCommand]);

  /*
   * Start speech recognition.
   */
  const startVoiceRecognition = useCallback(
    (handsFreeSession = false) => {
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
       * Never listen while Cook Assist is speaking or
       * waiting to speak.
       */
      if (
        speakingRef.current ||
        speechPendingRef.current
      ) {
        return;
      }

      /*
       * Prevent multiple recognition sessions.
       */
      if (recognitionRef.current) {
        return;
      }

      const recognition =
        new SpeechRecognitionAPI();

      recognition.lang = "en-CA";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognitionRef.current = recognition;

      recognition.onstart = () => {
        if (!handsFreeSession) {
          setHeardCommand("");
        }

        setVoiceStatus("listening");

        if (handsFreeSession) {
          setVoiceMessage(
            'Hands-Free Mode is listening. Say "Cook Assist" followed by a command.'
          );
        } else {
          setVoiceMessage("Listening...");
        }
      };

      recognition.onresult = (
        event: SpeechRecognitionEvent
      ) => {
        const transcript =
          event.results[0]?.[0]?.transcript ?? "";

        if (!transcript) {
          if (!handsFreeSession) {
            setVoiceStatus("error");
            setVoiceMessage(
              "I could not hear a command. Please try again."
            );
          }

          return;
        }

        processVoiceCommandRef.current?.(
          transcript,
          handsFreeSession
        );
      };

      recognition.onerror = (
        event: SpeechRecognitionErrorEvent
      ) => {
        if (
          event.error === "not-allowed" ||
          event.error === "service-not-allowed"
        ) {
          handsFreeModeRef.current = false;

          setHandsFreeMode(false);
          setVoiceStatus("error");
          setVoiceMessage(
            "Microphone permission was denied. Allow microphone access in your browser to use voice commands."
          );

          return;
        }

        if (event.error === "audio-capture") {
          handsFreeModeRef.current = false;

          setHandsFreeMode(false);
          setVoiceStatus("error");
          setVoiceMessage(
            "No microphone was detected."
          );

          return;
        }

        if (event.error === "aborted") {
          return;
        }

        /*
         * No speech is normal in Hands-Free Mode.
         */
        if (
          event.error === "no-speech" &&
          handsFreeSession &&
          handsFreeModeRef.current
        ) {
          return;
        }

        if (event.error === "no-speech") {
          setVoiceStatus("error");
          setVoiceMessage(
            "No speech was detected. Tap the microphone and try again."
          );

          return;
        }

        if (
          handsFreeSession &&
          handsFreeModeRef.current
        ) {
          return;
        }

        setVoiceStatus("error");
        setVoiceMessage(
          "Voice recognition was unsuccessful. Please try again."
        );
      };

      recognition.onend = () => {
        if (
          recognitionRef.current === recognition
        ) {
          recognitionRef.current = null;
        }

        /*
         * Do not restart recognition while speech is
         * pending or active.
         *
         * speakText() will restart it after speech ends.
         */
        if (
          speechPendingRef.current ||
          speakingRef.current
        ) {
          return;
        }

        /*
         * Continue listening during Hands-Free Mode.
         */
        if (
          handsFreeSession &&
          handsFreeModeRef.current
        ) {
          window.setTimeout(() => {
            if (
              handsFreeModeRef.current &&
              !recognitionRef.current &&
              !speakingRef.current &&
              !speechPendingRef.current
            ) {
              startVoiceRecognitionRef.current?.(
                true
              );
            }
          }, 300);

          return;
        }

        /*
         * Manual microphone session ended without
         * a recognized command.
         */
        if (!handsFreeSession) {
          setVoiceStatus((currentStatus) => {
            if (currentStatus === "listening") {
              setVoiceMessage(
                "No command was detected. Tap the microphone to try again."
              );

              return "error";
            }

            return currentStatus;
          });
        }
      };

      try {
        recognition.start();
      } catch {
        if (
          recognitionRef.current === recognition
        ) {
          recognitionRef.current = null;
        }

        if (
          handsFreeSession &&
          handsFreeModeRef.current
        ) {
          window.setTimeout(() => {
            if (
              handsFreeModeRef.current &&
              !recognitionRef.current &&
              !speakingRef.current &&
              !speechPendingRef.current
            ) {
              startVoiceRecognitionRef.current?.(
                true
              );
            }
          }, 500);

          return;
        }

        setVoiceStatus("error");
        setVoiceMessage(
          "Voice recognition could not be started. Please try again."
        );
      }
    },
    []
  );

  /*
   * Keep recognition starter ref synchronized.
   */
  useEffect(() => {
    startVoiceRecognitionRef.current =
      startVoiceRecognition;
  }, [startVoiceRecognition]);

  /*
   * Check browser speech-recognition support.
   */
  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition ??
      window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setVoiceSupported(false);
      setVoiceStatus("unsupported");
      setVoiceMessage(
        "Voice commands are not supported in this browser. Manual controls are still available."
      );
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  /*
   * Toggle Hands-Free Mode.
   */
  function toggleHandsFreeMode() {
    if (!voiceSupported) {
      setVoiceStatus("unsupported");
      setVoiceMessage(
        "Hands-Free Mode is not supported in this browser."
      );
      return;
    }

    /*
     * TURN OFF
     */
    if (handsFreeModeRef.current) {
      handsFreeModeRef.current = false;
      speechPendingRef.current = false;

      setHandsFreeMode(false);
      setVoiceStatus("idle");
      setHeardCommand("");
      setVoiceMessage(
        "Hands-Free Mode is off. Tap the microphone and speak a command."
      );

      if (recognitionRef.current) {
        const activeRecognition =
          recognitionRef.current;

        recognitionRef.current = null;

        try {
          activeRecognition.abort();
        } catch {
          // Recognition may already have ended.
        }
      }

      return;
    }

    /*
     * TURN ON
     */
    handsFreeModeRef.current = true;

    setHandsFreeMode(true);
    setHeardCommand("");
    setVoiceStatus("listening");
    setVoiceMessage(
      'Hands-Free Mode is listening. Say "Cook Assist" followed by a command.'
    );

    if (recognitionRef.current) {
      const activeRecognition =
        recognitionRef.current;

      recognitionRef.current = null;

      try {
        activeRecognition.abort();
      } catch {
        // Recognition may already have ended.
      }

      window.setTimeout(() => {
        if (
          handsFreeModeRef.current &&
          !recognitionRef.current &&
          !speakingRef.current &&
          !speechPendingRef.current
        ) {
          startVoiceRecognitionRef.current?.(
            true
          );
        }
      }, 300);

      return;
    }

    startVoiceRecognition(true);
  }

  /*
   * Stop speech services when leaving the page.
   */
  useEffect(() => {
    return () => {
      handsFreeModeRef.current = false;
      speechPendingRef.current = false;
      speakingRef.current = false;

      if (recognitionRef.current) {
        const activeRecognition =
          recognitionRef.current;

        recognitionRef.current = null;

        try {
          activeRecognition.abort();
        } catch {
          // Recognition may already have ended.
        }
      }

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

        {/* Current Step */}
        <section className="flex flex-1 flex-col px-6 pt-8">
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

          <div className="flex flex-1 items-center justify-center py-8">
            <h1 className="text-center text-3xl font-semibold leading-relaxed text-gray-900">
              {currentStep.instruction}
            </h1>
          </div>
        </section>

        {/* Timer */}
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

          {/* Hands-Free Mode */}
          <div className="mb-5 flex items-center justify-between rounded-2xl bg-white p-4">
            <div className="pr-4">
              <p className="font-semibold text-gray-900">
                Hands-Free Mode
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                {handsFreeMode
                  ? 'Listening for "Cook Assist" commands.'
                  : "Enable continuous voice listening while cooking."}
              </p>
            </div>

            <button
              type="button"
              onClick={toggleHandsFreeMode}
              disabled={!voiceSupported}
              role="switch"
              aria-checked={handsFreeMode}
              aria-label="Toggle Hands-Free Mode"
              className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                handsFreeMode
                  ? "bg-gray-900"
                  : "bg-gray-300"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                  handsFreeMode
                    ? "left-7"
                    : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Microphone */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() =>
                startVoiceRecognition(false)
              }
              disabled={
                !voiceSupported ||
                voiceStatus === "listening" ||
                handsFreeMode
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

          {/* Heard */}
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

          {/* Command Help */}
          <div className="mt-4 border-t border-gray-200 pt-4">
            {handsFreeMode ? (
              <p className="text-xs leading-5 text-gray-500">
                Say &quot;Cook Assist, Next Step&quot; ·
                &quot; Cook Assist, Previous Step&quot; ·
                &quot; Cook Assist, Repeat Step&quot; ·
                &quot; Cook Assist, Start Timer&quot; ·
                &quot; Cook Assist, Pause Timer&quot; ·
                &quot; Cook Assist, Resume Timer&quot; ·
                &quot; Cook Assist, Reset Timer&quot;
              </p>
            ) : (
              <p className="text-xs leading-5 text-gray-500">
                Try saying: &quot;Next Step&quot; ·
                &quot; Previous Step&quot; ·
                &quot; Repeat Step&quot; ·
                &quot; Start Timer&quot; ·
                &quot; Pause Timer&quot; ·
                &quot; Resume Timer&quot; ·
                &quot; Reset Timer&quot;
              </p>
            )}
          </div>
        </section>

        {/* Manual Controls */}
        <section className="px-6 pb-6">
          <p className="mb-4 text-center text-sm text-gray-500">
            Manual controls
          </p>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleManualPreviousStep}
              disabled={currentStepIndex === 0}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-2xl font-bold text-white shadow-md transition hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
              aria-label="Previous step"
            >
              ←
            </button>

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
                onClick={handleManualNextStep}
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