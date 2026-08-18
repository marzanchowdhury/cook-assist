# Cook Assist

Cook Assist is an interactive cooking assistant prototype developed for COMP 3451. The application is designed to make following recipes easier while cooking by reducing unnecessary interaction with a mobile device.

## Prototype Purpose

This prototype is a proof of concept demonstrating the main Cook Assist user experience. It focuses on providing simple, step-by-step cooking instructions and integrating useful cooking tools directly into the recipe workflow.

## Current Features

- Mobile-friendly interface
- Recipe home screen
- Recipe details and ingredients
- Step-by-step cooking instructions
- Previous and next step navigation
- Recipe progress tracking
- Spoken instructions using text-to-speech
- Integrated cooking timer
- Pause, resume, and reset timer controls
- Timer completion feedback
- Recipe completion screen

## Prototype Workflow

The main prototype workflow is:

Home → Recipe Details → Start Cooking → Cooking Steps → Finish Recipe → Recipe Complete

The Chicken Stir-Fry recipe is used to demonstrate the complete interaction.

## Running the Prototype

### Requirements

- Node.js
- npm
- A modern web browser

### Installation

Clone the repository:

```bash
git clone https://github.com/marzanchowdhury/cook-assist.git

```

Move into the project directory:

```bash
cd cook-assist
```

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open the following address in your browser:

```text
http://localhost:3000
```

## Testing the Prototype

1. Open the Home screen.
2. Select **View Recipe** for Chicken Stir-Fry.
3. Review the recipe information and ingredients.
4. Select **Start Cooking**.
5. Use the arrow controls to move between cooking steps.
6. Select **Repeat Step** to hear the current instruction aloud.
7. On Step 3, use the integrated demonstration timer.
8. Continue through the cooking instructions until Step 6.
9. Select **Finish**.
10. The Recipe Complete screen will appear.

## Prototype Limitations

Cook Assist is currently a proof-of-concept prototype rather than a complete production application.

The microphone button represents planned voice-command functionality. Full speech recognition is not implemented in the current prototype. Future development could support commands such as:

- Next Step
- Previous Step
- Repeat Step
- Start Timer
- Stop Timer

The timer on Step 3 uses a shortened demonstration countdown instead of the full cooking duration so that the feature can be quickly evaluated during prototype testing.

## Technology Used

- Next.js
- React
- TypeScript
- Tailwind CSS
- Web Speech Synthesis API

## Course

COMP 3451