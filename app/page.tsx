"use client";

import {
  ChangeEvent,
  MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { Capacitor } from "@capacitor/core";

type SpeechRecognitionEventLike = Event & {
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type NativeSpeechListener = {
  remove: () => Promise<void>;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type Chat = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  folder: string;
};

type Message = {
  role: "user" | "ai";
  content: string;
  image?: string;
};

const welcomeMessage: Message = {
  role: "ai",
  content:
    "Hello Sabir Ji! 👋 Main MR ELON HACKER AI hoon. Aap mujhse kuch bhi pooch sakte ho.",
};

const folders = [
  "General",
  "Work",
  "Study",
  "Coding",
  "Personal",
];

export default function HomePage() {
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>([
    welcomeMessage,
  ]);

  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("All");

  const [openMenuId, setOpenMenuId] =
    useState<string | null>(null);

  const [openFolderId, setOpenFolderId] =
    useState<string | null>(null);

  const [mobileSidebar, setMobileSidebar] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const speechRecognitionRef =
    useRef<SpeechRecognitionInstance | null>(null);

  const nativePartialListenerRef =
    useRef<NativeSpeechListener | null>(null);

  const nativeStateListenerRef =
    useRef<NativeSpeechListener | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(true);
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [voiceLanguage, setVoiceLanguage] = useState("hi-IN");
  const [voiceSpeed, setVoiceSpeed] = useState(0.95);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserPromptRef = useRef<string>("");

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadUserAndChats();

    try {
      const savedLanguage = localStorage.getItem("elon-voice-language");
      const savedSpeed = localStorage.getItem("elon-voice-speed");
      const savedOutput = localStorage.getItem("elon-voice-output");
      const savedGender = localStorage.getItem("elon-voice-gender");

      if (savedLanguage === "hi-IN" || savedLanguage === "en-US" || savedLanguage === "ne-NP") {
        setVoiceLanguage(savedLanguage);
      }

      if (savedSpeed) {
        const parsedSpeed = Number(savedSpeed);
        if ([0.7, 0.95, 1.2].includes(parsedSpeed)) {
          setVoiceSpeed(parsedSpeed);
        }
      }

      if (savedOutput !== null) {
        setVoiceOutput(savedOutput === "true");
      }

      if (savedGender === "female" || savedGender === "male") {
        setVoiceGender(savedGender);
      }
    } catch {
      // Browser storage unavailable hone par defaults use honge.
    }
  }, []);

  useEffect(() => {
    if (currentChatId) {
      try {
        localStorage.setItem("elon-current-chat-id", currentChatId);
      } catch {
        // Ignore storage errors.
      }
    } else {
      try {
        localStorage.removeItem("elon-current-chat-id");
      } catch {
        // Ignore storage errors.
      }
    }
  }, [currentChatId]);

  useEffect(() => {
    if (loadingChats || currentChatId || chats.length === 0) {
      return;
    }

    try {
      const savedChatId = localStorage.getItem("elon-current-chat-id");

      if (savedChatId && chats.some((chat) => chat.id === savedChatId)) {
        loadChat(savedChatId);
      } else if (savedChatId) {
        localStorage.removeItem("elon-current-chat-id");
      }
    } catch {
      // Ignore storage errors.
    }
  }, [loadingChats, chats, currentChatId]);

  useEffect(() => {
    try {
      localStorage.setItem("elon-voice-language", voiceLanguage);
      localStorage.setItem("elon-voice-speed", String(voiceSpeed));
      localStorage.setItem("elon-voice-output", String(voiceOutput));
      localStorage.setItem("elon-voice-gender", voiceGender);
    } catch {
      // Ignore storage errors.
    }
  }, [voiceLanguage, voiceSpeed, voiceOutput, voiceGender]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, loading]);

  async function loadUserAndChats() {
    setLoadingChats(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("chats")
      .select(
        "id,title,created_at,updated_at,is_pinned,folder"
      )
      .eq("user_id", user.id)
      .order("is_pinned", {
        ascending: false,
      })
      .order("updated_at", {
        ascending: false,
      });

    if (error) {
      console.error("LOAD CHATS ERROR:", error);
    }

    if (!error && data) {
      setChats(data as Chat[]);
    }

    setLoadingChats(false);
  }

  async function loadChat(chatId: string) {
    setCurrentChatId(chatId);
    setOpenMenuId(null);
    setOpenFolderId(null);
    setMobileSidebar(false);

    const { data, error } = await supabase
      .from("messages")
      .select("role,content,image_url")
      .eq("chat_id", chatId)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error("LOAD CHAT ERROR:", error);
      return;
    }

    const loadedMessages: Message[] = [];

    for (const message of data || []) {
      let imageUrl: string | undefined;

      if (message.image_url) {
        const {
          data: signedData,
          error: signedError,
        } = await supabase.storage
          .from("chat-images")
          .createSignedUrl(
            message.image_url,
            60 * 60 * 24
          );

        if (signedError) {
          console.error(
            "IMAGE SIGNED URL ERROR:",
            signedError
          );
        } else {
          imageUrl =
            signedData?.signedUrl || undefined;
        }
      }

      loadedMessages.push({
        role:
          message.role === "ai"
            ? "ai"
            : "user",
        content: message.content || "",
        ...(imageUrl
          ? { image: imageUrl }
          : {}),
      });
    }

    setMessages(
      loadedMessages.length
        ? loadedMessages
        : [welcomeMessage]
    );
  }

  function newChat() {
    setCurrentChatId(null);
    setMessages([welcomeMessage]);
    setInput("");
    setImage(null);

    setOpenMenuId(null);
    setOpenFolderId(null);
    setMobileSidebar(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function renameChat(chat: Chat) {
    const newTitle = window.prompt(
      "New chat name:",
      chat.title
    );

    if (!newTitle?.trim()) {
      return;
    }

    const title = newTitle.trim();

    const { error } = await supabase
      .from("chats")
      .update({
        title,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", chat.id);

    if (error) {
      alert("Chat rename nahi ho paaya.");
      console.error(error);
      return;
    }

    setChats((prev) =>
      prev.map((item) =>
        item.id === chat.id
          ? { ...item, title }
          : item
      )
    );

    setOpenMenuId(null);
  }

  async function togglePin(
    chat: Chat,
    e?: MouseEvent<HTMLButtonElement>
  ) {
    e?.stopPropagation();

    const nextPinned = !chat.is_pinned;

    const { error } = await supabase
      .from("chats")
      .update({
        is_pinned: nextPinned,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", chat.id);

    if (error) {
      alert("Pin update nahi ho paaya.");
      console.error(error);
      return;
    }

    setChats((prev) =>
      [...prev.map((item) =>
        item.id === chat.id
          ? {
              ...item,
              is_pinned: nextPinned,
            }
          : item
      )].sort((a, b) => {
        if (
          a.is_pinned !==
          b.is_pinned
        ) {
          return (
            Number(b.is_pinned) -
            Number(a.is_pinned)
          );
        }

        return (
          new Date(
            b.updated_at
          ).getTime() -
          new Date(
            a.updated_at
          ).getTime()
        );
      })
    );

    setOpenMenuId(null);
  }

  async function changeFolder(
    chat: Chat,
    folder: string
  ) {
    const { error } = await supabase
      .from("chats")
      .update({
        folder,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", chat.id);

    if (error) {
      alert(
        "Folder change nahi ho paaya."
      );
      console.error(error);
      return;
    }

    setChats((prev) =>
      prev.map((item) =>
        item.id === chat.id
          ? {
              ...item,
              folder,
            }
          : item
      )
    );

    setOpenFolderId(null);
    setOpenMenuId(null);
  }

  async function deleteChat(
    chatId: string,
    e?: MouseEvent<HTMLButtonElement>
  ) {
    e?.stopPropagation();

    const confirmDelete =
      window.confirm(
        "Kya aap ye chat delete karna chahte ho?"
      );

    if (!confirmDelete) {
      return;
    }

    const { error } = await supabase
      .from("chats")
      .delete()
      .eq("id", chatId);

    if (error) {
      alert("Chat delete nahi ho paayi.");
      console.error(error);
      return;
    }

    setChats((prev) =>
      prev.filter(
        (chat) => chat.id !== chatId
      )
    );

    if (currentChatId === chatId) {
      newChat();
    }

    setOpenMenuId(null);
  }

  function handleImageChange(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.type !== "image/jpeg") {
      alert(
        "Abhi sirf JPG/JPEG image upload karo."
      );

      e.target.value = "";
      return;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      alert(
        "Image maximum 10 MB ki honi chahiye."
      );

      e.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImage(
        reader.result as string
      );
    };

    reader.onerror = () => {
      alert(
        "Image read nahi ho paayi."
      );
    };

    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function clearNativeSpeechListeners() {
    const listeners = [
      nativePartialListenerRef.current,
      nativeStateListenerRef.current,
    ];

    nativePartialListenerRef.current = null;
    nativeStateListenerRef.current = null;

    for (const listener of listeners) {
      if (!listener) continue;
      try {
        await listener.remove();
      } catch {
        // Listener already removed; ignore.
      }
    }
  }

  async function stopListening() {
    if (Capacitor.isNativePlatform()) {
      try {
        const { SpeechRecognition } = await import(
          "@capacitor-community/speech-recognition"
        );
        await SpeechRecognition.stop();
      } catch (error) {
        console.error("NATIVE SPEECH STOP ERROR:", error);
      }

      await clearNativeSpeechListeners();
      setIsListening(false);
      return;
    }

    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    setIsListening(false);
  }

  async function toggleVoiceInput() {
    if (isListening) {
      await stopListening();
      return;
    }

    // Android APK / Capacitor: use the native speech-recognition plugin.
    if (Capacitor.isNativePlatform()) {
      try {
        const { SpeechRecognition } = await import(
          "@capacitor-community/speech-recognition"
        );

        const availability = await SpeechRecognition.available();

        if (!availability.available) {
          alert(
            "Is Android device par Speech Recognition available nahi hai."
          );
          return;
        }

        const permissions = await SpeechRecognition.checkPermissions();

        if (permissions.speechRecognition !== "granted") {
          const requested =
            await SpeechRecognition.requestPermissions();

          if (requested.speechRecognition !== "granted") {
            alert(
              "Microphone permission allow karo, phir dobara mic dabao."
            );
            return;
          }
        }

        await clearNativeSpeechListeners();

        nativePartialListenerRef.current =
          await SpeechRecognition.addListener(
            "partialResults",
            (data: { matches?: string[] }) => {
              const transcript = data.matches?.[0]?.trim();

              if (transcript) {
                setInput(transcript);
              }
            }
          );

        nativeStateListenerRef.current =
          await SpeechRecognition.addListener(
            "listeningState",
            (data: { status?: string }) => {
              if (data.status?.toLowerCase() === "stopped") {
                setIsListening(false);
                void clearNativeSpeechListeners();
              }
            }
          );

        setIsListening(true);

        await SpeechRecognition.start({
          language: voiceLanguage,
          maxResults: 1,
          partialResults: true,
        });
      } catch (error) {
        console.error("NATIVE SPEECH ERROR:", error);
        setIsListening(false);
        await clearNativeSpeechListeners();
        alert(
          "Voice Input start nahi ho paaya. Android microphone permission check karo."
        );
      }

      return;
    }

    // Normal website/browser: use Web Speech API.
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice Input is browser mein supported nahi hai. Chrome ya Edge try karo."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = voiceLanguage;

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let i = event.results.length - 1;
        i >= 0;
        i--
      ) {
        transcript =
          event.results[i][0]?.transcript || "";

        if (transcript) break;
      }

      if (transcript) {
        setInput(transcript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      speechRecognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      speechRecognitionRef.current = null;
    };

    speechRecognitionRef.current = recognition;
    setIsListening(true);

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      speechRecognitionRef.current = null;
    }
  }

  async function speakAIResponse(text: string) {
    if (!voiceOutput || !text.trim()) return;

    // Android APK / Capacitor: native TTS.
    if (Capacitor.isNativePlatform()) {
      try {
        const { TextToSpeech } = await import(
          "@capacitor-community/text-to-speech"
        );

        await TextToSpeech.stop();

        await TextToSpeech.speak({
          text: text.trim(),
          lang: voiceLanguage,
          rate: voiceSpeed,
          pitch: 1,
          volume: 1,
        });

        return;
      } catch (error) {
        console.error("NATIVE TTS ERROR:", error);
        // Browser fallback below.
      }
    }

    // Normal website/browser: use browser speech synthesis.
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(text);

    utterance.lang = voiceLanguage;
    utterance.rate = voiceSpeed;
    utterance.pitch = voiceGender === "female" ? 1.05 : 0.95;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const languagePrefix =
      voiceLanguage.toLowerCase().split("-")[0];

    const languageVoices = voices.filter((voice) =>
      voice.lang
        .toLowerCase()
        .startsWith(languagePrefix)
    );

    const femaleHints = [
      "female",
      "zira",
      "samantha",
      "karen",
      "moira",
      "susan",
      "google हिन्दी",
      "google hindi",
      "heera",
      "veena",
      "neerja",
      "swara",
      "lekha",
      "priya",
      "aditi",
    ];

    const maleHints = [
      "male",
      "david",
      "mark",
      "daniel",
      "alex",
      "ravi",
      "hemant",
      "rishi",
      "madhur",
      "google हिंदी",
      "google hindi",
    ];

    const hints =
      voiceGender === "female"
        ? femaleHints
        : maleHints;

    const preferredVoice =
      languageVoices.find((voice) => {
        const name = voice.name.toLowerCase();
        return hints.some((hint) =>
          name.includes(hint)
        );
      }) || languageVoices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  function stopVoiceOutput() {
    if (Capacitor.isNativePlatform()) {
      void import(
        "@capacitor-community/text-to-speech"
      )
        .then(({ TextToSpeech }) =>
          TextToSpeech.stop()
        )
        .catch((error) =>
          console.error("NATIVE TTS STOP ERROR:", error)
        );
    }

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }
  }

  function stopGenerating() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
  }

  async function copyMessage(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 1400);
    } catch {
      alert("Copy nahi ho paaya.");
    }
  }

  function startEdit(index: number, text: string) {
    setEditingIndex(index);
    setEditingText(text);
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditingText("");
  }

  async function saveEditAndSend() {
    const text = editingText.trim();
    if (!text || editingIndex === null || loading) return;

    const editedIndex = editingIndex;
    setEditingIndex(null);
    setEditingText("");
    stopVoiceOutput();

    const previousMessages = messages.slice(0, editedIndex);
    const editedMessage: Message = { role: "user", content: text };
    const updatedMessages = [...previousMessages, editedMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    lastUserPromptRef.current = text;

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({ messages: updatedMessages, image: null, chatId: currentChatId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "AI response failed.");

      const aiText = data.message || "AI se response nahi mila.";
      setMessages([...updatedMessages, { role: "ai", content: aiText }]);
      speakAIResponse(aiText);
      if (data.chatId) setCurrentChatId(data.chatId);
      await loadUserAndChats();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessages((prev) => [...prev, { role: "ai", content: error instanceof Error ? `❌ ${error.message}` : "❌ Kuch error aa gaya." }]);
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  }

  async function regenerateResponse(index: number) {
    if (loading || index <= 0 || messages[index]?.role !== "ai") return;

    const previousUserIndex = [...messages.slice(0, index)].reverse().findIndex((m) => m.role === "user");
    if (previousUserIndex === -1) return;
    const userIndex = index - 1 - previousUserIndex;
    const previousMessages = messages.slice(0, userIndex + 1);
    const userMessage = messages[userIndex];
    if (!userMessage) return;

    stopVoiceOutput();
    setMessages(previousMessages);
    setLoading(true);
    lastUserPromptRef.current = userMessage.content;

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({ messages: previousMessages, image: userMessage.image || null, chatId: currentChatId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "AI response failed.");
      const aiText = data.message || "AI se response nahi mila.";
      setMessages([...previousMessages, { role: "ai", content: aiText }]);
      speakAIResponse(aiText);
      if (data.chatId) setCurrentChatId(data.chatId);
      await loadUserAndChats();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessages((prev) => [...prev, { role: "ai", content: error instanceof Error ? `❌ ${error.message}` : "❌ Kuch error aa gaya." }]);
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  }

  function renderMarkdown(text: string) {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, partIndex) => {
      if (part.startsWith("```")) {
        const lines = part.replace(/^```[^\n]*\n?/, "").replace(/```$/, "");
        return (
          <pre key={partIndex} className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-3 text-xs leading-5">
            <code>{lines}</code>
          </pre>
        );
      }
      return (
        <span key={partIndex}>
          {part.split("\n").map((line, lineIndex) => (
            <span key={lineIndex}>
              {line.split(/(\*\*[^*]+\*\*)/g).map((piece, pieceIndex) =>
                piece.startsWith("**") && piece.endsWith("**") ? (
                  <strong key={pieceIndex}>{piece.slice(2, -2)}</strong>
                ) : (
                  <span key={pieceIndex}>{piece}</span>
                )
              )}
              {lineIndex < part.split("\n").length - 1 && <br />}
            </span>
          ))}
        </span>
      );
    });
  }

  function makeChatTitle(text: string) {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return "New Chat";
    return clean.length > 42
      ? `${clean.slice(0, 42).trim()}…`
      : clean;
  }

  async function sendMessage() {
    if (
      (!input.trim() && !image) ||
      loading
    ) {
      return;
    }

    await stopListening();
    stopVoiceOutput();

    const userText = input.trim();
    const currentImage = image;

    const userMessage: Message = {
      role: "user",
      content: userText,
      ...(currentImage
        ? { image: currentImage }
        : {}),
    };

    const updatedMessages = [
      ...messages.filter(
        (message) =>
          message !== welcomeMessage
      ),
      userMessage,
    ];

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setInput("");
    setLoading(true);
    setImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    try {
      abortControllerRef.current = new AbortController();
      lastUserPromptRef.current = userText;
      const response =
        await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            messages:
              updatedMessages,
            image: currentImage,
            chatId:
              currentChatId,
          }),
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "AI response failed."
        );
      }

      if (data.imageUrl) {
        setMessages((prev) => {
          const next = [...prev];

          for (
            let i =
              next.length - 1;
            i >= 0;
            i--
          ) {
            if (
              next[i].role ===
              "user"
            ) {
              next[i] = {
                ...next[i],
                image:
                  data.imageUrl,
              };

              break;
            }
          }

          return next;
        });
      }

      const aiText =
        data.message ||
        "AI se response nahi mila.";

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: aiText,
        },
      ]);

      speakAIResponse(aiText);

      if (data.chatId) {
        setCurrentChatId(
          data.chatId
        );

        // New chats get a useful title immediately from the first message.
        if (!currentChatId) {
          const title = makeChatTitle(userText);
          const { error: titleError } = await supabase
            .from("chats")
            .update({ title })
            .eq("id", data.chatId);

          if (titleError) {
            console.error("CHAT TITLE ERROR:", titleError);
          }
        }
      }

      await loadUserAndChats();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error(
        "SEND MESSAGE ERROR:",
        error
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            error instanceof Error
              ? `❌ ${error.message}`
              : "❌ Kuch error aa gaya.",
        },
      ]);
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  }

  async function logout() {
    stopListening();
    stopVoiceOutput();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      speechRecognitionRef.current?.stop();
      void clearNativeSpeechListeners();

      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        window.speechSynthesis.cancel();
      }

      if (Capacitor.isNativePlatform()) {
        void import(
          "@capacitor-community/speech-recognition"
        )
          .then(({ SpeechRecognition }) =>
            SpeechRecognition.stop()
          )
          .catch(() => {});

        void import(
          "@capacitor-community/text-to-speech"
        )
          .then(({ TextToSpeech }) =>
            TextToSpeech.stop()
          )
          .catch(() => {});
      }
    };
  }, []);

  const filteredChats =
    chats.filter((chat) => {
      const matchesSearch =
        chat.title
          .toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesFolder =
        selectedFolder === "All" ||
        chat.folder ===
          selectedFolder;

      return (
        matchesSearch &&
        matchesFolder
      );
    });

  function SidebarContent() {
    return (
      <>
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-wide">
                ⚡ MR ELON
              </h1>

              <p className="mt-1 text-xs text-zinc-500">
                AI COMMAND CENTER
              </p>
            </div>

            <button
              onClick={newChat}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-lg transition hover:bg-white/10"
              title="New Chat"
            >
              ＋
            </button>
          </div>

          <div className="mt-5">
            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search chats..."
              className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20"
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {[
              "All",
              ...folders,
            ].map((folder) => (
              <button
                key={folder}
                onClick={() =>
                  setSelectedFolder(
                    folder
                  )
                }
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition ${
                  selectedFolder ===
                  folder
                    ? "bg-white text-black"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {folder ===
                "All"
                  ? "All"
                  : `📁 ${folder}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loadingChats ? (
            <div className="px-3 py-4 text-sm text-zinc-600">
              Loading chats...
            </div>
          ) : filteredChats.length ===
            0 ? (
            <div className="px-3 py-8 text-center text-sm text-zinc-600">
              No chats found.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredChats.map(
                (chat) => (
                  <div
                    key={chat.id}
                    className="relative"
                  >
                    <button
                      onClick={() =>
                        loadChat(
                          chat.id
                        )
                      }
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                        currentChatId ===
                        chat.id
                          ? "bg-white/10 text-white"
                          : "text-zinc-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="shrink-0 text-sm">
                        {chat.is_pinned
                          ? "📌"
                          : "💬"}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">
                          {chat.title}
                        </div>

                        <div className="mt-1 truncate text-[10px] text-zinc-600">
                          📁{" "}
                          {
                            chat.folder
                          }
                        </div>
                      </div>

                      <span
                        className="relative z-10 shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"
                        onClick={(
                          e
                        ) => {
                          e.stopPropagation();

                          setOpenMenuId(
                            openMenuId ===
                              chat.id
                              ? null
                              : chat.id
                          );
                        }}
                      >
                        ⋮
                      </span>
                    </button>

                    {openMenuId ===
                      chat.id && (
                      <div className="absolute right-2 top-12 z-50 w-44 rounded-xl border border-white/10 bg-[#111113] p-1.5 shadow-2xl">
                        <button
                          onClick={(
                            e
                          ) =>
                            togglePin(
                              chat,
                              e
                            )
                          }
                          className="flex w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
                        >
                          {chat.is_pinned
                            ? "📍 Unpin Chat"
                            : "📌 Pin Chat"}
                        </button>

                        <button
                          onClick={() =>
                            setOpenFolderId(
                              openFolderId ===
                                chat.id
                                ? null
                                : chat.id
                            )
                          }
                          className="flex w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
                        >
                          📁 Move to Folder
                        </button>

                        <button
                          onClick={() =>
                            renameChat(
                              chat
                            )
                          }
                          className="flex w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
                        >
                          ✏️ Rename
                        </button>

                        <div className="my-1 border-t border-white/10" />

                        <button
                          onClick={(
                            e
                          ) =>
                            deleteChat(
                              chat.id,
                              e
                            )
                          }
                          className="flex w-full rounded-lg px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}

                    {openFolderId ===
                      chat.id && (
                      <div className="absolute right-[-175px] top-12 z-[60] w-44 rounded-xl border border-white/10 bg-[#111113] p-1.5 shadow-2xl">
                        <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-600">
                          Select folder
                        </div>

                        {folders.map(
                          (
                            folder
                          ) => (
                            <button
                              key={
                                folder
                              }
                              onClick={() =>
                                changeFolder(
                                  chat,
                                  folder
                                )
                              }
                              className={`flex w-full rounded-lg px-3 py-2 text-left text-xs ${
                                chat.folder ===
                                folder
                                  ? "bg-white/10 text-white"
                                  : "text-zinc-400 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              📁{" "}
                              {
                                folder
                              }
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-4">
          <button
            onClick={logout}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            🚪 Logout
          </button>
        </div>
      </>
    );
  }

  return (
    <main className="h-dvh overflow-hidden bg-[#050505] text-white">
      {/* MOBILE SIDEBAR OVERLAY */}

      {mobileSidebar && (
        <div
          className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() =>
            setMobileSidebar(false)
          }
        />
      )}

      {/* MOBILE SIDEBAR */}

      <aside
        className={`fixed inset-y-0 left-0 z-[100] flex w-[290px] flex-col border-r border-white/10 bg-[#09090b] transition-transform duration-300 md:hidden ${
          mobileSidebar
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <h1 className="font-bold">
              ⚡ MR ELON HACKER
            </h1>

            <p className="text-[10px] text-zinc-600">
              AI COMMAND CENTER
            </p>
          </div>

          <button
            onClick={() =>
              setMobileSidebar(false)
            }
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <SidebarContent />
      </aside>

      <div className="flex h-full min-h-0">
        {/* DESKTOP SIDEBAR */}

        <aside className="hidden h-full min-h-0 w-[310px] flex-col border-r border-white/10 bg-[#09090b] md:flex">
          <SidebarContent />
        </aside>

        {/* CHAT */}

        <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* HEADER */}

          <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-3 md:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setMobileSidebar(true)
                }
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-lg md:hidden"
              >
                ☰
              </button>

              <div>
                <h2 className="text-sm font-semibold tracking-wide">
                  MR ELON HACKER
                </h2>

                <p className="text-[10px] text-zinc-600">
                  AI ASSISTANT
                </p>
              </div>
            </div>

            <button
              onClick={newChat}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10"
            >
              ＋ <span className="hidden sm:inline">New Chat</span>
            </button>
          </header>

          {/* MESSAGES */}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-4 sm:py-6 md:px-8">
            <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`elon-message flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`group max-w-[92%] rounded-2xl px-3 py-3 text-sm leading-6 sm:max-w-[85%] sm:px-4 ${message.role === "user" ? "bg-white text-black" : "border border-white/10 bg-white/[0.04] text-zinc-200"}`}
                  >
                    {message.image && (
                      <img src={message.image} alt="Uploaded" className="mb-3 max-h-72 max-w-full rounded-xl object-contain sm:max-h-80" />
                    )}

                    {editingIndex === index && message.role === "user" ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={3}
                          autoFocus
                          className="w-full resize-none rounded-xl border border-black/10 bg-zinc-100 p-2 text-sm text-black outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={cancelEdit} className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:bg-black/5">Cancel</button>
                          <button onClick={saveEditAndSend} className="rounded-lg bg-black px-3 py-1.5 text-xs text-white">Save & Send</button>
                        </div>
                      </div>
                    ) : (
                      message.content && (
                        <div className="break-words">{message.role === "ai" ? renderMarkdown(message.content) : <span className="whitespace-pre-wrap">{message.content}</span>}</div>
                      )
                    )}

                    {message.role === "user" && editingIndex !== index && (
                      <div className="mt-2 flex justify-end gap-1 opacity-60 transition sm:opacity-0 sm:group-hover:opacity-100">
                        <button onClick={() => startEdit(index, message.content)} className="rounded-lg px-2 py-1 text-[10px] hover:bg-black/10" title="Edit message">✏️ Edit</button>
                        <button onClick={() => copyMessage(message.content, index)} className="rounded-lg px-2 py-1 text-[10px] hover:bg-black/10" title="Copy message">{copiedIndex === index ? "✓ Copied" : "📋 Copy"}</button>
                      </div>
                    )}

                    {message.role === "ai" && (
                      <div className="mt-2 flex flex-wrap gap-1 border-t border-white/5 pt-2 opacity-70">
                        <button onClick={() => copyMessage(message.content, index)} className="rounded-lg px-2 py-1 text-[10px] text-zinc-500 hover:bg-white/10 hover:text-white">{copiedIndex === index ? "✓ Copied" : "📋 Copy"}</button>
                        <button onClick={() => regenerateResponse(index)} disabled={loading} className="rounded-lg px-2 py-1 text-[10px] text-zinc-500 hover:bg-white/10 hover:text-white disabled:opacity-30">↻ Regenerate</button>
                        {voiceOutput && <button onClick={() => speakAIResponse(message.content)} className="rounded-lg px-2 py-1 text-[10px] text-zinc-500 hover:bg-white/10 hover:text-white">🔊 Replay</button>}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
                    <div className="flex gap-1">
                      <span className="elon-dot h-2 w-2 rounded-full bg-white/50" />
                      <span className="elon-dot h-2 w-2 rounded-full bg-white/50" />
                      <span className="elon-dot h-2 w-2 rounded-full bg-white/50" />
                    </div>
                  </div>
                  <button onClick={stopGenerating} className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300 hover:bg-red-400/20">⏹ Stop generating</button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* IMAGE PREVIEW */}

          {image && (
            <div className="mx-auto mb-2 flex w-full max-w-4xl px-3 sm:px-4">
              <div className="relative rounded-xl border border-white/10 bg-white/5 p-2">
                <img
                  src={image}
                  alt="Preview"
                  className="h-20 w-20 rounded-lg object-cover"
                />

                <button
                  onClick={removeImage}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-black"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* VOICE SETTINGS */}

          {showVoiceSettings && (
            <div className="border-t border-white/10 bg-white/[0.02] px-3 py-3 sm:px-4 md:px-6">
              <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <span className="mr-1 text-xs font-semibold text-zinc-300">🎙️ Voice</span>

                <select
                  value={voiceGender}
                  onChange={(e) => {
                    stopVoiceOutput();
                    setVoiceGender(e.target.value as "female" | "male");
                  }}
                  className="rounded-xl border border-white/10 bg-[#111113] px-3 py-2 text-xs text-zinc-200 outline-none"
                  title="AI voice"
                >
                  <option value="female">👩 Female Voice</option>
                  <option value="male">👨 Male Voice</option>
                </select>

                <select
                  value={voiceLanguage}
                  onChange={(e) => {
                    stopListening();
                    stopVoiceOutput();
                    setVoiceLanguage(e.target.value);
                  }}
                  className="rounded-xl border border-white/10 bg-[#111113] px-3 py-2 text-xs text-zinc-200 outline-none"
                  title="Voice language"
                >
                  <option value="hi-IN">🇮🇳 Hindi</option>
                  <option value="en-US">🇺🇸 English</option>
                  <option value="ne-NP">🇳🇵 Nepali</option>
                </select>

                <select
                  value={voiceSpeed}
                  onChange={(e) => setVoiceSpeed(Number(e.target.value))}
                  className="rounded-xl border border-white/10 bg-[#111113] px-3 py-2 text-xs text-zinc-200 outline-none"
                  title="Voice speed"
                >
                  <option value="0.7">🐢 Slow</option>
                  <option value="0.95">▶️ Normal</option>
                  <option value="1.2">⚡ Fast</option>
                </select>

                <button
                  onClick={stopVoiceOutput}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/10 hover:text-white"
                >
                  ⏹️ Stop Voice
                </button>

                <span className="text-[10px] text-zinc-600">
                  Settings automatically save
                </span>
              </div>
            </div>
          )}

          {/* INPUT */}

          <div className="shrink-0 border-t border-white/10 p-3 pb-4 sm:p-4 md:p-6">
            <div className="mx-auto flex max-w-4xl items-end gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-2xl sm:gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg"
                onChange={
                  handleImageChange
                }
                className="hidden"
              />

              <button
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="mb-1 rounded-xl p-2.5 text-zinc-500 transition hover:bg-white/10 hover:text-white sm:p-3"
                title="Upload JPG"
              >
                📎
              </button>

              <textarea
                value={input}
                onChange={(e) =>
                  setInput(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key ===
                      "Enter" &&
                    !e.shiftKey
                  ) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                placeholder="Message MR ELON..."
                className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-1.5 py-2.5 text-sm outline-none placeholder:text-zinc-600 sm:min-h-12 sm:px-2 sm:py-3"
              />

              <button
                onClick={() => setShowVoiceSettings((prev) => !prev)}
                className={`mb-1 rounded-xl border px-3 py-2.5 text-sm transition sm:px-3 sm:py-3 ${
                  showVoiceSettings
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/10 bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-white"
                }`}
                title="Voice Settings"
                aria-label="Voice Settings"
              >
                ⚙️
              </button>

              <button
                onClick={toggleVoiceInput}
                disabled={loading}
                className={`mb-1 rounded-xl border px-3 py-2.5 text-sm transition sm:px-3 sm:py-3 ${
                  isListening
                    ? "border-red-400/40 bg-red-400/15 text-red-300"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                }`}
                title={
                  isListening
                    ? "Stop Voice Input"
                    : "Voice Input"
                }
                aria-label={
                  isListening
                    ? "Stop Voice Input"
                    : "Voice Input"
                }
              >
                {isListening ? "⏹️" : "🎤"}
              </button>

              <button
                onClick={() => {
                  if (voiceOutput) {
                    stopVoiceOutput();
                  }
                  setVoiceOutput((prev) => !prev);
                }}
                className={`mb-1 rounded-xl border px-3 py-2.5 text-sm transition sm:px-3 sm:py-3 ${
                  voiceOutput
                    ? "border-white/10 bg-white/5 text-white"
                    : "border-white/10 bg-white/5 text-zinc-600"
                }`}
                title={
                  voiceOutput
                    ? "AI Voice Output: ON"
                    : "AI Voice Output: OFF"
                }
                aria-label={
                  voiceOutput
                    ? "AI Voice Output On"
                    : "AI Voice Output Off"
                }
              >
                {voiceOutput ? "🔊" : "🔇"}
              </button>

              <button
                onClick={sendMessage}
                disabled={
                  loading ||
                  (!input.trim() &&
                    !image)
                }
                className="mb-1 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30 sm:px-4 sm:py-3"
              >
                ↑
              </button>
            </div>

            <p className="mt-2 text-center text-[9px] text-zinc-700 sm:mt-3 sm:text-[10px]">
              MR ELON HACKER can make
              mistakes. Verify important
              information.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}