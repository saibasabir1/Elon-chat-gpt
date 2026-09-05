"use client";

import { ChangeEvent, useRef, useState } from "react";

type Message = {
  role: "user" | "ai";
  content: string;
  image?: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content:
        "Hello Sabir Ji 👋 Main MR ELON HACKER hoon. Aap text ya photo ke saath kuch bhi pooch sakte ho.",
    },
  ]);

  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Sirf image file select karo.");
      return;
    }

    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      alert("Image 10MB se chhoti honi chahiye.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImage(reader.result as string);
    };

    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function sendMessage() {
    const text = input.trim();

    if ((!text && !image) || loading) return;

    const userMessage: Message = {
      role: "user",
      content: text || "Is photo ko analyze karo.",
      image: image || undefined,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");

    const imageToSend = image;
    setImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          image: imageToSend,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "API error");
      }

      setMessages((current) => [
        ...current,
        {
          role: "ai",
          content: data.message || "AI ne koi response nahi diya.",
        },
      ]);
    } catch (error) {
      console.error(error);

      setMessages((current) => [
        ...current,
        {
          role: "ai",
          content:
            "❌ AI se response nahi aa raha. Check karo ki Ollama running hai.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function newChat() {
    setMessages([
      {
        role: "ai",
        content:
          "Hello Sabir Ji 👋 Main MR ELON HACKER hoon. Aap text ya photo ke saath kuch bhi pooch sakte ho.",
      },
    ]);

    setInput("");
    removeImage();
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside className="hidden w-64 border-r border-zinc-800 bg-zinc-950 p-5 md:flex md:flex-col">
          <div className="mb-8">
            <h1 className="text-xl font-bold tracking-wide">
              ⚡ MR ELON HACKER
            </h1>

            <p className="mt-1 text-xs text-zinc-500">
              Personal AI Assistant
            </p>
          </div>

          <button
            onClick={newChat}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-left text-sm transition hover:bg-zinc-800"
          >
            ＋ New Chat
          </button>

          <div className="mt-auto rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">STATUS</p>

            <p className="mt-1 text-sm text-green-400">
              ● Ollama Online
            </p>
          </div>
        </aside>

        {/* MAIN */}
        <section className="flex min-h-screen flex-1 flex-col">

          {/* HEADER */}
          <header className="border-b border-zinc-800 bg-zinc-950/80 px-5 py-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  MR ELON HACKER
                </h2>

                <p className="text-xs text-zinc-500">
                  Personal AI Assistant
                </p>
              </div>

              <div className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-green-400">
                ● Online
              </div>
            </div>
          </header>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto px-4 py-8 md:px-10">
            <div className="mx-auto flex max-w-3xl flex-col gap-5">

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "bg-white text-black"
                        : "border border-zinc-800 bg-zinc-900 text-zinc-200"
                    }`}
                  >
                    {/* USER IMAGE */}
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Uploaded"
                        className="mb-3 max-h-80 max-w-full rounded-xl object-contain"
                      />
                    )}

                    {/* MESSAGE */}
                    <div className="whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}

              {/* LOADING */}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-sm text-zinc-400">
                    MR ELON HACKER photo analyze kar raha hai... 🤖
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* INPUT AREA */}
          <div className="border-t border-zinc-800 bg-zinc-950 p-4">
            <div className="mx-auto max-w-3xl">

              {/* IMAGE PREVIEW */}
              {image && (
                <div className="mb-3">
                  <div className="relative inline-block">

                    <img
                      src={image}
                      alt="Selected image"
                      className="h-28 w-28 rounded-xl border border-zinc-700 object-cover"
                    />

                    <button
                      onClick={removeImage}
                      title="Remove image"
                      className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-lg text-white hover:bg-red-600"
                    >
                      ×
                    </button>

                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">

                {/* HIDDEN FILE INPUT */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />

                {/* PHOTO BUTTON */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  title="Photo upload"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-xl transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  📷
                </button>

                {/* VOICE */}
                <button
                  type="button"
                  title="Voice"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-lg transition hover:bg-zinc-800"
                >
                  🎤
                </button>

                {/* TEXT INPUT */}
                <input
                  value={input}
                  disabled={loading}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendMessage();
                    }
                  }}
                  placeholder={
                    image
                      ? "Photo ke baare mein question poochho..."
                      : "Message MR ELON HACKER..."
                  }
                  className="h-12 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-500 disabled:opacity-50"
                />

                {/* SEND */}
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={loading || (!input.trim() && !image)}
                  className="h-12 rounded-xl bg-white px-5 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "..." : "➤"}
                </button>

              </div>

              <p className="mt-3 text-center text-[11px] text-zinc-600">
                MR ELON HACKER can make mistakes. Verify important information.
              </p>

            </div>
          </div>

        </section>
      </div>
    </main>
  );
}