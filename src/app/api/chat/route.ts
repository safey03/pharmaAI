import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

type Product = {
  id: number;
  name: string;
  category: "Treatment" | "Cosmetics";
  price: number;
};

type CartItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
};

type ChatMessage = {
  role: "user" | "assistant" | "model";
  content: string;
};

type AIAction = {
  type:
    | "ADD_TO_CART"
    | "INCREASE_QUANTITY"
    | "DECREASE_QUANTITY"
    | "SET_QUANTITY"
    | "REMOVE_FROM_CART"
    | "CONFIRM_ORDER";
  productId?: number;
  quantity?: number;
};

type AIResponse = {
  message: string;
  action: AIAction | null;
};

export async function POST(request: NextRequest) {
  try {
    // =========================================================
    // 1. GET GEMINI API KEY
    // =========================================================

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");

      return NextResponse.json(
        {
          message:
            "Gemini API key is missing. Please check your Vercel Environment Variables.",
          action: null,
        },
        { status: 500 }
      );
    }

    // =========================================================
    // 2. READ REQUEST
    // =========================================================

    const body = await request.json();

    const messages: ChatMessage[] = Array.isArray(body.messages)
      ? body.messages
      : [];

    const products: Product[] = Array.isArray(body.products)
      ? body.products
      : [];

    const cart: CartItem[] = Array.isArray(body.cart)
      ? body.cart
      : [];

    if (messages.length === 0) {
      return NextResponse.json(
        {
          message: "Please send a message.",
          action: null,
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 3. CREATE GEMINI CLIENT
    // =========================================================

    const ai = new GoogleGenAI({
      apiKey,
    });

    // =========================================================
    // 4. BUILD PRODUCT CATALOG
    // =========================================================

    const catalog =
      products.length > 0
        ? products
            .map(
              (product) =>
                `ID: ${product.id}
Name: ${product.name}
Category: ${product.category}
Price: EGP ${product.price}`
            )
            .join("\n\n")
        : "No products are currently available.";

    // =========================================================
    // 5. BUILD CART INFORMATION
    // =========================================================

    const cartInfo =
      cart.length > 0
        ? cart
            .map(
              (item) =>
                `ID: ${item.id}
Name: ${item.name}
Quantity: ${item.quantity}
Unit Price: EGP ${item.price}
Total: EGP ${item.price * item.quantity}`
            )
            .join("\n\n")
        : "The cart is currently empty.";

    // =========================================================
    // 6. IMPORTANT FIX:
    //
    // Gemini conversations MUST start with USER.
    //
    // Your frontend starts with an assistant welcome message:
    //
    // assistant -> "Hi! I'm PharmaAI..."
    //
    // We must NOT send that first assistant message to Gemini.
    //
    // We also normalize roles and merge consecutive messages
    // with the same role.
    // =========================================================

    const firstUserIndex = messages.findIndex(
      (message) =>
        message &&
        message.role === "user" &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
    );

    if (firstUserIndex === -1) {
      return NextResponse.json(
        {
          message: "Please send a message.",
          action: null,
        },
        { status: 400 }
      );
    }

    const conversationMessages = messages
      .slice(firstUserIndex)
      .filter(
        (message) =>
          message &&
          typeof message.content === "string" &&
          message.content.trim().length > 0
      );

    // =========================================================
    // 7. CONVERT FRONTEND ROLES TO GEMINI ROLES
    // =========================================================

    const normalizedMessages: {
      role: "user" | "model";
      text: string;
    }[] = [];

    for (const message of conversationMessages) {
      const role =
        message.role === "user"
          ? "user"
          : "model";

      const text = message.content.trim();

      if (!text) continue;

      const previous =
        normalizedMessages[
          normalizedMessages.length - 1
        ];

      // =======================================================
      // Gemini expects alternating user/model messages.
      //
      // If two messages have the same role, merge them.
      // =======================================================

      if (previous && previous.role === role) {
        previous.text += `\n${text}`;
      } else {
        normalizedMessages.push({
          role,
          text,
        });
      }
    }

    // Make absolutely sure conversation starts with USER.
    if (
      normalizedMessages.length === 0 ||
      normalizedMessages[0].role !== "user"
    ) {
      return NextResponse.json(
        {
          message: "Please send your message again.",
          action: null,
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 8. CONVERT TO GEMINI CONTENT FORMAT
    // =========================================================

    const contents = normalizedMessages.map(
      (message) => ({
        role: message.role,
        parts: [
          {
            text: message.text,
          },
        ],
      })
    );

    // =========================================================
    // 9. SYSTEM INSTRUCTION
    // =========================================================

    const systemInstruction = `
You are PharmaAI, the AI assistant for a pharmacy website.

Your job is to help customers with pharmacy products,
treatments, cosmetics, prices, availability, and shopping cart actions.

IMPORTANT RULES:

1. Only answer questions related to:
   - Pharmacy products
   - Treatments
   - Cosmetics
   - Product prices
   - Product availability
   - Shopping cart
   - Adding products to cart
   - Removing products from cart
   - Changing product quantities
   - General safe product information

2. Do NOT invent products.

3. Do NOT invent prices.

4. Use ONLY the products from the catalog provided below.

5. Always respond in English.

6. Keep responses concise and helpful.

7. If the user asks something unrelated to the pharmacy,
   politely explain that PharmaAI only handles pharmacy products,
   treatments, cosmetics, prices, and the shopping cart.

8. Never say that an order was placed unless the user explicitly
   confirms the order.

9. If the user asks to ADD a product to the cart,
   return an ADD_TO_CART action.

10. If the user asks to REMOVE a product,
    return a REMOVE_FROM_CART action.

11. If the user asks to INCREASE quantity,
    return an INCREASE_QUANTITY action.

12. If the user asks to DECREASE quantity,
    return a DECREASE_QUANTITY action.

13. If the user asks for an exact quantity,
    return a SET_QUANTITY action.

14. If the user asks to checkout or confirm the order,
    return a CONFIRM_ORDER action.

15. When identifying a product, use the exact product ID
    from the catalog.

16. Product names may be typed differently by the customer.
    For example:
    "nivea"
    "nivea soft"
    "Nivea Soft"
    should all match the catalog product "Nivea Soft".

17. Do not confuse similar products.

CURRENT PRODUCT CATALOG:

${catalog}

CURRENT SHOPPING CART:

${cartInfo}

IMPORTANT RESPONSE FORMAT:

You MUST return valid JSON.

Do NOT return Markdown.

Do NOT use code fences.

Use exactly:

{
  "message": "Your response to the customer",
  "action": null
}

When a cart action is needed:

{
  "message": "Your response to the customer",
  "action": {
    "type": "ADD_TO_CART",
    "productId": 1,
    "quantity": 1
  }
}

ALLOWED ACTION TYPES:

ADD_TO_CART
INCREASE_QUANTITY
DECREASE_QUANTITY
SET_QUANTITY
REMOVE_FROM_CART
CONFIRM_ORDER

EXAMPLE:

User:
add nivea soft

Response:

{
  "message": "Nivea Soft has been added to your cart.",
  "action": {
    "type": "ADD_TO_CART",
    "productId": 10,
    "quantity": 1
  }
}

Example:

User:
add 2 nivea soft

Response:

{
  "message": "I added 2 Nivea Soft products to your cart.",
  "action": {
    "type": "ADD_TO_CART",
    "productId": 10,
    "quantity": 2
  }
}

Example:

User:
remove nivea soft

Response:

{
  "message": "Nivea Soft has been removed from your cart.",
  "action": {
    "type": "REMOVE_FROM_CART",
    "productId": 10
  }
}

Example:

User:
increase nivea soft

Response:

{
  "message": "I increased the quantity of Nivea Soft.",
  "action": {
    "type": "INCREASE_QUANTITY",
    "productId": 10
  }
}

Example:

User:
decrease nivea soft

Response:

{
  "message": "I decreased the quantity of Nivea Soft.",
  "action": {
    "type": "DECREASE_QUANTITY",
    "productId": 10
  }
}

Example:

User:
set nivea soft quantity to 3

Response:

{
  "message": "The quantity of Nivea Soft is now 3.",
  "action": {
    "type": "SET_QUANTITY",
    "productId": 10,
    "quantity": 3
  }
}

Example:

User:
show my cart

Response:

{
  "message": "Here is your current cart...",
  "action": null
}

Example:

User:
checkout

Response:

{
  "message": "Your order is ready for confirmation.",
  "action": {
    "type": "CONFIRM_ORDER"
  }
}
`;

    // =========================================================
    // 10. CALL GEMINI
    // =========================================================

    const response =
      await ai.models.generateContent({
        model: "gemini-2.5-flash",

        contents,

        config: {
          systemInstruction,

          temperature: 0.2,

          responseMimeType:
            "application/json",
        },
      });

    // =========================================================
    // 11. GET RESPONSE TEXT
    // =========================================================

    const text = response.text?.trim();

    if (!text) {
      console.error(
        "Gemini returned an empty response"
      );

      return NextResponse.json(
        {
          message:
            "PharmaAI returned an empty response. Please try again.",
          action: null,
        },
        { status: 500 }
      );
    }

    console.log(
      "PharmaAI Gemini response:",
      text
    );

    // =========================================================
    // 12. PARSE JSON
    // =========================================================

    let parsed: AIResponse;

    try {
      parsed = JSON.parse(text);
    } catch (error) {
      console.error(
        "Gemini returned invalid JSON:",
        error
      );

      // Try removing accidental Markdown fences.
      const cleanedText = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      try {
        parsed = JSON.parse(cleanedText);
      } catch {
        return NextResponse.json({
          message: cleanedText,
          action: null,
        });
      }
    }

    // =========================================================
    // 13. VALIDATE RESPONSE
    // =========================================================

    const message =
      typeof parsed.message === "string"
        ? parsed.message
        : "How can I help you with our pharmacy products?";

    let action: AIAction | null = null;

    if (
      parsed.action &&
      typeof parsed.action === "object" &&
      typeof parsed.action.type === "string"
    ) {
      action = parsed.action;
    }

    // =========================================================
    // 14. RETURN RESPONSE TO FRONTEND
    // =========================================================

    return NextResponse.json({
      message,
      action,
    });
  } catch (error) {
    // =========================================================
    // 15. ERROR HANDLING
    // =========================================================

    console.error(
      "PHARMA AI ERROR:",
      error
    );

    let errorMessage =
      "Sorry, I couldn't connect to PharmaAI right now. Please try again.";

    if (error instanceof Error) {
      console.error(
        "Error message:",
        error.message
      );

      /*
       * Don't expose the complete Gemini/API error
       * to the customer.
       */
      if (
        error.message
          .toLowerCase()
          .includes("api key")
      ) {
        errorMessage =
          "There is a problem with the Gemini API configuration. Please check the API key.";
      }
    }

    return NextResponse.json(
      {
        message: errorMessage,
        action: null,
      },
      {
        status: 500,
      }
    );
  }
}