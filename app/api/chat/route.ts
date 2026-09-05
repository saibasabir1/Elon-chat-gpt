export async function POST(request: Request) {
  try {
    const body = await request.json();

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const image = body.image;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    // =========================
    // PHOTO + TEXT
    // =========================
    if (image) {
      const match = image.match(
        /^data:(image\/[^;]+);base64,(.+)$/
      );

      if (!match) {
        return Response.json(
          { error: "Invalid image format." },
          { status: 400 }
        );
      }

      const mimeType = match[1];
      const base64Data = match[2];

      const lastUserMessage =
        [...messages]
          .reverse()
          .find(
            (message: any) => message.role === "user"
          )
          ?.content?.trim() ||
        "Analyze this image and describe what you see.";

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: lastUserMessage,
                  },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("GEMINI IMAGE ERROR:", data);

        return Response.json(
          {
            error:
              data?.error?.message ||
              "Gemini image analysis failed.",
          },
          { status: response.status }
        );
      }

      return Response.json({
        message:
          data?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "Gemini se image response nahi mila.",
      });
    }

    // =========================
    // TEXT ONLY
    // =========================

    const contents = messages
      .filter(
        (message: any) =>
          message.content?.trim()
      )
      .map((message: any) => ({
        role:
          message.role === "ai"
            ? "model"
            : "user",
        parts: [
          {
            text: message.content,
          },
        ],
      }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("GEMINI ERROR:", data);

      return Response.json(
        {
          error:
            data?.error?.message ||
            "Gemini API request failed.",
        },
        { status: response.status }
      );
    }

    return Response.json({
      message:
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Gemini se response nahi mila.",
    });
  } catch (error) {
    console.error("GEMINI ERROR:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gemini se connection nahi ho pa raha.",
      },
      { status: 500 }
    );
  }
}