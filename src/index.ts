import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { VoltAgentExporter } from "@voltagent/vercel-ai-exporter";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { z } from "zod";
import * as readline from "node:readline";

// Initialize VoltAgent exporter
const voltAgentExporter = new VoltAgentExporter({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});

// Set up OpenTelemetry SDK
const sdk = new NodeSDK({
  traceExporter: voltAgentExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Example 1: Basic telemetry (no tools, no metadata)
async function runBasicTelemetry() {
  console.log("\n🔷 Example 1: Basic Telemetry\n");
  console.log("📋 Just enable telemetry - VoltAgent will track with default agent");

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: "Hello, how are you?",
    experimental_telemetry: {
      isEnabled: true,
      // That's it! VoltAgent will track this with a default agent
    },
  });

  console.log("Assistant:", result.text);
  console.log("\n💡 Check VoltAgent console - you'll see tracking under default agent");
}

// Example 2: Add tools
async function runWithTools() {
  console.log("\n🔷 Example 2: Add Tools\n");
  console.log("🔧 Same setup, but now with tools - see how tool usage is tracked");

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: "What's the weather like in Tokyo?",
    tools: {
      weather: {
        description: "Get the weather in a location",
        parameters: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) => {
          console.log(`🌤️  Fetching weather for ${location}...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return {
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
          };
        },
      },
    },
    maxSteps: 5,
    experimental_telemetry: {
      isEnabled: true,
      // Still using default agent, but now with tools
    },
  });

  console.log("Assistant:", result.text);
  console.log("\n💡 Check VoltAgent console - you'll see tool usage tracked under default agent");
}

// Example 3: Add agentId for better tracking
async function runWithMetadata() {
  console.log("\n🔷 Example 3: Add Metadata\n");
  console.log("🎯 Now with metadata - much better tracking and identification");
  // <!-- GIF placeholder: Show console difference between default agent and named agent -->

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: "What's the weather like in Paris?",
    tools: {
      weather: {
        description: "Get the weather in a location",
        parameters: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) => {
          console.log(`🌤️  Fetching weather for ${location}...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return {
            location,
            temperature: 18 + Math.floor(Math.random() * 21) - 10,
          };
        },
      },
    },
    maxSteps: 5,
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        agentId: "weather-assistant",
        instructions: "You are a helpful weather assistant",
      },
    },
  });

  console.log("Assistant:", result.text);
  console.log("\n💡 Check VoltAgent console - you'll see 'weather-assistant' with basic metadata");
}

// Example 4: More metadata
async function runMoreMetadata() {
  console.log("\n🔷 Example 4: More Metadata\n");
  console.log("🎯 Now with more metadata - user tracking and tags");

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: "What's the weather like in Tokyo?",
    tools: {
      weather: {
        description: "Get the weather in a location",
        parameters: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) => {
          console.log(`🌤️  Fetching weather for ${location}...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return {
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
          };
        },
      },
    },
    maxSteps: 5,
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        agentId: "weather-assistant",
        userId: "demo-user",
        conversationId: "weather-chat",
        tags: ["weather", "demo"],
        instructions: "You are a helpful weather assistant",
      },
    },
  });

  console.log("Assistant:", result.text);
  console.log("\n💡 Check VoltAgent console - you'll see 'weather-assistant' with rich metadata");
}

// Example 5: Multi-Agent
async function runMultiAgent() {
  console.log("\n🔷 Example 5: Multi-Agent\n");
  console.log("🎯 Parent-child agent relationships for complex workflows");

  // 1. Main Agent: Planning
  const { text: plan } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: "Create a plan for organizing a team meeting",
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        agentId: "planning-agent",
        userId: "team-lead",
        conversationId: "meeting-organization",
        instructions: "You create meeting plans and agendas",
        tags: ["planning", "meetings"],
      },
    },
  });

  console.log("Planning Agent:", plan);

  // 2. Child Agent: Execution
  const { text: execution } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Execute this plan: ${plan}`,
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        agentId: "execution-agent",
        parentAgentId: "planning-agent", // Parent relationship
        userId: "team-lead",
        conversationId: "meeting-organization", // Same conversation
        instructions: "You handle meeting logistics and execution",
        tags: ["execution", "logistics"],
      },
    },
  });

  console.log("Execution Agent:", execution);
  console.log(
    "\n💡 Check VoltAgent console - you'll see parent-child relationships and event propagation",
  );
}

// Main menu
async function showMenu() {
  console.log("\n🚀 VoltAgent + Vercel AI SDK Progressive Examples");
  console.log("Learn step-by-step how to add observability:\n");
  console.log("1. Basic Telemetry (minimal setup)");
  console.log("2. With Tools (see tool tracking)");
  console.log("3. With Metadata (agent identification)");
  console.log("4. More Metadata (user tracking & tags)");
  console.log("5. Multi-Agent (parent-child relationships)");
  console.log("6. Run All Examples");
  console.log("9. Exit");

  const choice = await askQuestion("\nWhich example would you like to run? (1-6, 9): ");

  switch (choice) {
    case "1":
      await runBasicTelemetry();
      break;
    case "2":
      await runWithTools();
      break;
    case "3":
      await runWithMetadata();
      break;
    case "4":
      await runMoreMetadata();
      break;
    case "5":
      await runMultiAgent();
      break;
    case "6":
      console.log("\n🎯 Running all examples to show progression...\n");
      await runBasicTelemetry();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await runWithTools();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await runWithMetadata();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await runMoreMetadata();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await runMultiAgent();
      console.log("\n🎉 Progressive Learning Complete!");
      console.log("💡 Compare the different tracking approaches in VoltAgent console");
      break;
    case "9":
      console.log("\n👋 Goodbye!");
      rl.close();
      return false;
    default:
      console.log("\n❌ Invalid selection. Please enter 1-6 or 9.");
  }

  return true;
}

async function main() {
  let continueRunning = true;

  console.log("🎬 VoltAgent Progressive Learning Demo");
  console.log("Learn how to integrate VoltAgent observability step-by-step");

  while (continueRunning) {
    continueRunning = await showMenu();

    if (continueRunning) {
      console.log(`\n${"=".repeat(60)}`);
      await askQuestion("\nPress Enter to continue...");
    }
  }

  // Ensure all telemetry is flushed before shutdown
  await sdk.shutdown();
}

main().catch(async (error) => {
  console.error("Error:", error);
  await sdk.shutdown();
  rl.close();
});
