import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    const userInput = lastMessage.content.toLowerCase();

    // Simple mock responses based on user input
    let reply = "I'm a demo AI assistant. I can help you with basic questions!";

    if (userInput.includes("hello") || userInput.includes("hi")) {
      reply = "Hello! How can I help you today?";
    } else if (userInput.includes("how are you")) {
      reply = "I'm doing great! Thanks for asking. How can I assist you?";
    } else if (userInput.includes("weather")) {
      reply =
        "I don't have access to real weather data, but I hope it's nice where you are!";
    } else if (userInput.includes("help")) {
      reply =
        "I'm here to help! You can ask me questions and I'll do my best to provide useful responses.";
    } else if (userInput.includes("time")) {
      reply = `The current time is ${new Date().toLocaleTimeString()}.`;
    } else if (userInput.includes("date")) {
      reply = `Today's date is ${new Date().toLocaleDateString()}.`;
    } else if (userInput.includes("name")) {
      reply = "I'm AIll Be Sick Assistant, your friendly AI helper!";
    } else if (userInput.includes("thank")) {
      reply = "You're welcome! I'm glad I could help.";
    } else {
      // Random responses for variety
      const responses = [
        "Mamamatay ka na",
        "WALA AKONG PAKE",
        "Subscribe to william bagets milker",
        "???",
        "MA'AM MONA THE BEST PROF",
      ];
      reply = responses[Math.floor(Math.random() * responses.length)];
    }

    // Simulate some processing time
    await new Promise((resolve) =>
      setTimeout(resolve, 500 + Math.random() * 1000)
    );

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
