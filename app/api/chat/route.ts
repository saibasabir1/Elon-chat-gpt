import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

type ChatMessage = {
  role: "user" | "ai";
  content: string;
  image?: string;
};

const GEMINI_MODEL = "gemini-3.6-flash";

function getOutputText(data: any): string {
  if (typeof data?.output_text === "string") {
    return data.output_text;
  }

  const steps = Array.isArray(data?.steps) ? data.steps : [];

  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];

    if (
      step?.type === "model_output" &&
      Array.isArray(step?.content)
    ) {
      const text = step.content
        .filter(
          (item: any) =>
            item?.type === "text" &&
            typeof item?.text === "string"
        )
        .map((item: any) => item.text)
        .join("");

      if (text) {
        return text;
      }
    }
  }

  return "Gemini se response nahi mila.";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Check logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { error: "Please login first." },
        { status: 401 }
      );
    }

    // 2. Read request
    const body = await request.json();

    const messages: ChatMessage[] = Array.isArray(body.messages)
      ? body.messages
      : [];

    const image =
      typeof body.image === "string"
        ? body.image
        : null;

    let chatId =
      typeof body.chatId === "string"
        ? body.chatId
        : null;

    if (!messages.length && !image) {
      return Response.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    // 3. Create chat if needed
    if (!chatId) {
      const firstUserMessage =
        messages
          .slice()
          .reverse()
          .find(
            (message) => message.role === "user"
          )
          ?.content?.trim() || "New Chat";

      const title =
        firstUserMessage.length > 50
          ? firstUserMessage.slice(0, 50) + "..."
          : firstUserMessage;

      const { data: newChat, error: chatError } =
        await supabase
          .from("chats")
          .insert({
            user_id: user.id,
            title,
          })
          .select("id")
          .single();

      if (chatError) {
        console.error(
          "CHAT CREATE ERROR:",
          chatError
        );

        return Response.json(
          {
            error: "Chat create nahi ho paaya.",
          },
          { status: 500 }
        );
      }

      chatId = newChat.id;
    }

    // TypeScript ko confirm karna ki chatId string hai
    if (!chatId) {
      return Response.json(
        { error: "Chat ID missing." },
        { status: 400 }
      );
    }

    // 4. Latest user message
    const lastUserMessage =
      messages
        .slice()
        .reverse()
        .find(
          (message) => message.role === "user"
        )
        ?.content?.trim() ||
      "Is photo ko analyze karo.";

    // 5. Upload image to Supabase Storage
    let imagePath: string | null = null;

    if (image) {
      const match = image.match(
        /^data:(image\/[^;]+);base64,(.+)$/
      );

      if (!match) {
        return Response.json(
          {
            error: "Invalid image format.",
          },
          { status: 400 }
        );
      }

      const mimeType = match[1];
      const base64Data = match[2];

      // Humne bucket mein sirf JPEG allow kiya hai
      if (mimeType !== "image/jpeg") {
        return Response.json(
          {
            error:
              "Abhi sirf JPG/JPEG images supported hain.",
          },
          { status: 400 }
        );
      }

      const fileBuffer = Buffer.from(
        base64Data,
        "base64"
      );

      const filePath = `${user.id}/${chatId}/${randomUUID()}.jpg`;

      const { error: uploadError } =
        await supabase.storage
          .from("chat-images")
          .upload(filePath, fileBuffer, {
            contentType: "image/jpeg",
            upsert: false,
          });

      if (uploadError) {
        console.error(
          "IMAGE UPLOAD ERROR:",
          uploadError
        );

        return Response.json(
          {
            error:
              "Image upload nahi ho paayi.",
          },
          { status: 500 }
        );
      }

      imagePath = filePath;
    }

    // 6. Save user message + image path
    const { error: userMessageError } =
      await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          role: "user",
          content: lastUserMessage,
          image_url: imagePath,
        });

    if (userMessageError) {
      console.error(
        "USER MESSAGE SAVE ERROR:",
        userMessageError
      );

      // Agar DB save fail ho, uploaded image cleanup karo
      if (imagePath) {
        await supabase.storage
          .from("chat-images")
          .remove([imagePath]);
      }

      return Response.json(
        {
          error:
            "User message save nahi ho paaya.",
        },
        { status: 500 }
      );
    }

    // 7. Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GEMINI_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    // 8. Build Gemini Interactions input
    let interactionInput: any;

    if (image) {
      const match = image.match(
        /^data:(image\/[^;]+);base64,(.+)$/
      );

      if (!match) {
        return Response.json(
          {
            error: "Invalid image format.",
          },
          { status: 400 }
        );
      }

      const mimeType = match[1];
      const base64Data = match[2];

      interactionInput = [
        {
          type: "user_input",
          content: [
            {
              type: "text",
              text: lastUserMessage,
            },
            {
              type: "image",
              data: base64Data,
              mime_type: mimeType,
            },
          ],
        },
      ];
    } else {
      interactionInput = messages
        .filter(
          (message) => message.content?.trim()
        )
        .map((message) => ({
          type:
            message.role === "ai"
              ? "model_output"
              : "user_input",
          content: [
            {
              type: "text",
              text: message.content,
            },
          ],
        }));
    }

    // 9. Gemini Interactions API
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          input: interactionInput,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "GEMINI INTERACTIONS ERROR:",
        data
      );

      return Response.json(
        {
          error:
            data?.error?.message ||
            "Gemini API request failed.",
        },
        {
          status: response.status,
        }
      );
    }

    // 10. Extract AI response
    const aiMessage = getOutputText(data);

    // 11. Save AI response
    const { error: aiMessageError } =
      await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          role: "ai",
          content: aiMessage,
        });

    if (aiMessageError) {
      console.error(
        "AI MESSAGE SAVE ERROR:",
        aiMessageError
      );
    }

    // 12. Update chat timestamp
    await supabase
      .from("chats")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", chatId);

    // 13. Create signed URL for immediate display
    let imageUrl: string | null = null;

    if (imagePath) {
      const { data: signedData } =
        await supabase.storage
          .from("chat-images")
          .createSignedUrl(
            imagePath,
            60 * 60 * 24
          );

      imageUrl =
        signedData?.signedUrl || null;
    }

    // 14. Return response
    return Response.json({
      message: aiMessage,
      chatId,
      interactionId: data?.id || null,
      imagePath,
      imageUrl,
    });
  } catch (error) {
    console.error(
      "CHAT API ERROR:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Server error.",
      },
      { status: 500 }
    );
  }
}