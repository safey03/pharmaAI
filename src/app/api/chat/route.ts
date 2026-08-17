import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

/* =========================================================
   TYPES
========================================================= */

type Category = "Treatment" | "Cosmetics";

type Product = {
  id: number;
  name: string;
  category: Category;
  price: number;
  description?: string;
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

type ActionType =
  | "ADD_TO_CART"
  | "INCREASE_QUANTITY"
  | "DECREASE_QUANTITY"
  | "SET_QUANTITY"
  | "REMOVE_FROM_CART"
  | "CONFIRM_ORDER";

type AIAction = {
  type: ActionType;
  productId?: number;
  quantity?: number;
};

type AIResponse = {
  message: string;
  action: AIAction | null;
};

/* =========================================================
   ALLOWED ACTIONS
========================================================= */

const ALLOWED_ACTIONS: ActionType[] = [
  "ADD_TO_CART",
  "INCREASE_QUANTITY",
  "DECREASE_QUANTITY",
  "SET_QUANTITY",
  "REMOVE_FROM_CART",
  "CONFIRM_ORDER",
];

/* =========================================================
   VALIDATE AI ACTION
========================================================= */

function validateAction(
  action: unknown,
  products: Product[]
): AIAction | null {
  if (!action || typeof action !== "object") {
    return null;
  }

  const value = action as Record<string, unknown>;

  /* Check action type */

  if (
    typeof value.type !== "string" ||
    !ALLOWED_ACTIONS.includes(
      value.type as ActionType
    )
  ) {
    return null;
  }

  const type = value.type as ActionType;

  /* Checkout does not need productId */

  if (type === "CONFIRM_ORDER") {
    return {
      type: "CONFIRM_ORDER",
    };
  }

  /* Other actions require productId */

  if (
    typeof value.productId !== "number" ||
    !Number.isInteger(value.productId)
  ) {
    return null;
  }

  /* Check product exists */

  const productExists = products.some(
    (product) =>
      product.id === value.productId
  );

  if (!productExists) {
    return null;
  }

  const result: AIAction = {
    type,
    productId: value.productId,
  };

  /* Quantity */

  if (
    typeof value.quantity === "number" &&
    Number.isFinite(value.quantity)
  ) {
    const quantity = Math.floor(
      value.quantity
    );

    if (quantity > 0) {
      result.quantity = quantity;
    }
  }

  /* ADD_TO_CART default quantity */

  if (type === "ADD_TO_CART") {
    result.quantity =
      result.quantity ?? 1;
  }

  /* SET_QUANTITY requires quantity */

  if (
    type === "SET_QUANTITY" &&
    typeof result.quantity !== "number"
  ) {
    return null;
  }

  return result;
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    console.log(
      "======================================"
    );

    console.log(
      "🔥 PHARMA AI REQUEST"
    );

    console.log(
      "======================================"
    );

    /* =====================================================
       API KEY
    ===================================================== */

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error(
        "❌ GEMINI_API_KEY is missing."
      );

      return NextResponse.json(
        {
          message:
            "Gemini API key is missing. Please check your .env.local file.",
          action: null,
        } satisfies AIResponse,
        {
          status: 500,
        }
      );
    }

    console.log(
      "✅ Gemini API key found."
    );

    /* =====================================================
       REQUEST BODY
    ===================================================== */

    const body = await request.json();

    const messages: ChatMessage[] =
      Array.isArray(body?.messages)
        ? body.messages
        : [];

    const products: Product[] =
      Array.isArray(body?.products)
        ? body.products
        : [];

    const cart: CartItem[] =
      Array.isArray(body?.cart)
        ? body.cart
        : [];

    console.log(
      "Messages:",
      messages.length
    );

    console.log(
      "Products:",
      products.length
    );

    console.log(
      "Cart:",
      cart.length
    );

    /* =====================================================
       VALIDATE MESSAGE
    ===================================================== */

    if (messages.length === 0) {
      return NextResponse.json(
        {
          message:
            "Please send a message.",
          action: null,
        } satisfies AIResponse,
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       PRODUCT CATALOG
    ===================================================== */

    const catalog =
      products.length > 0
        ? products
            .map(
              (product) => `
Product ID: ${product.id}
Name: ${product.name}
Category: ${product.category}
Price: EGP ${product.price}
Description: ${
                product.description ??
                "No description available"
              }
`
            )
            .join("\n")
        : "No products are currently available.";

    /* =====================================================
       CART
    ===================================================== */

    const cartText =
      cart.length > 0
        ? cart
            .map(
              (item) => `
Product ID: ${item.id}
Name: ${item.name}
Quantity: ${item.quantity}
Unit Price: EGP ${item.price}
Subtotal: EGP ${
                item.price *
                item.quantity
              }
`
            )
            .join("\n")
        : "Cart is empty.";

    const cartTotal = cart.reduce(
      (total, item) =>
        total +
        item.price * item.quantity,
      0
    );

    /* =====================================================
       CONVERSATION
    ===================================================== */

    /*
      We remove leading assistant messages.

      This prevents Gemini from receiving an
      assistant/model message as the first message.
    */

    const validMessages =
      messages.filter(
        (message) =>
          message &&
          typeof message.content ===
            "string" &&
          message.content.trim().length > 0
      );

    const firstUserIndex =
      validMessages.findIndex(
        (message) =>
          message.role === "user"
      );

    if (firstUserIndex === -1) {
      return NextResponse.json(
        {
          message:
            "Please send a valid user message.",
          action: null,
        } satisfies AIResponse,
        {
          status: 400,
        }
      );
    }

    const conversation =
      validMessages.slice(
        firstUserIndex
      );

    const contents = conversation.map(
      (message) => ({
        role:
          message.role === "user"
            ? "user"
            : "model",

        parts: [
          {
            text: message.content.trim(),
          },
        ],
      })
    );

    /* =====================================================
       SYSTEM INSTRUCTION
    ===================================================== */

    const systemInstruction = `
You are PharmaAI.

You are a smart pharmacy shopping assistant.

==================================================
WHAT YOU CAN TALK ABOUT
==================================================

You ONLY handle:

- Pharmacy products
- Treatments
- Cosmetics
- Product prices
- Product descriptions
- Product availability
- Shopping cart
- Adding products to cart
- Removing products from cart
- Increasing quantity
- Decreasing quantity
- Setting quantity
- Checkout

If the user asks about something unrelated to these topics,
politely say:

"I'm PharmaAI, and I can only help with our pharmacy products,
treatments, cosmetics, prices, availability, and shopping cart."

==================================================
IMPORTANT RULES
==================================================

1. Only use products from the provided catalog.

2. NEVER invent a product.

3. NEVER invent a price.

4. NEVER invent a product ID.

5. Always use the exact product ID from the catalog.

6. Always respond in English.

7. Keep answers short, clear and friendly.

8. Do not diagnose diseases.

9. Do not guarantee that a medicine is safe for a specific person.

10. For medical questions, provide general information only
and recommend consulting a doctor or pharmacist when appropriate.

11. Never claim that an order is confirmed unless the website
actually confirms it.

12. If the user asks for products, use ONLY products in the catalog.

13. If the user asks about the cart, use the CURRENT CART data.

14. Prices are always in Egyptian Pounds (EGP).

==================================================
CART ACTIONS
==================================================

When the user clearly asks to ADD a product:

{
  "type": "ADD_TO_CART",
  "productId": PRODUCT_ID,
  "quantity": NUMBER
}

When the user asks to INCREASE quantity:

{
  "type": "INCREASE_QUANTITY",
  "productId": PRODUCT_ID
}

When the user asks to DECREASE quantity:

{
  "type": "DECREASE_QUANTITY",
  "productId": PRODUCT_ID
}

When the user asks for an exact quantity:

{
  "type": "SET_QUANTITY",
  "productId": PRODUCT_ID,
  "quantity": NUMBER
}

When the user asks to remove a product:

{
  "type": "REMOVE_FROM_CART",
  "productId": PRODUCT_ID
}

When the user clearly asks to checkout:

{
  "type": "CONFIRM_ORDER"
}

When the user is only asking a question:

"action": null

==================================================
EXAMPLES
==================================================

User:
"Add Panadol Extra"

Response:
{
  "message": "Sure! I've added Panadol Extra to your cart.",
  "action": {
    "type": "ADD_TO_CART",
    "productId": 1,
    "quantity": 1
  }
}

User:
"Add 3 Panadol Extra"

Response:
{
  "message": "Sure! I've added 3 Panadol Extra to your cart.",
  "action": {
    "type": "ADD_TO_CART",
    "productId": 1,
    "quantity": 3
  }
}

User:
"Remove Panadol Extra"

Response:
{
  "message": "Sure! I've removed Panadol Extra from your cart.",
  "action": {
    "type": "REMOVE_FROM_CART",
    "productId": 1
  }
}

User:
"Make CeraVe Moisturizer quantity 4"

Response:
{
  "message": "Done! CeraVe Moisturizer quantity is now 4.",
  "action": {
    "type": "SET_QUANTITY",
    "productId": 7,
    "quantity": 4
  }
}

User:
"Checkout"

Response:
{
  "message": "Sure! Let's proceed to checkout.",
  "action": {
    "type": "CONFIRM_ORDER"
  }
}

==================================================
PRODUCT CATALOG
==================================================

${catalog}

==================================================
CURRENT CART
==================================================

${cartText}

==================================================
CURRENT CART TOTAL
==================================================

EGP ${cartTotal}

==================================================
RESPONSE FORMAT
==================================================

Return ONLY valid JSON.

Do NOT use markdown.

Do NOT use code fences.

Do NOT write anything before or after the JSON.

The JSON must have exactly these fields:

{
  "message": "string",
  "action": null
}

OR:

{
  "message": "string",
  "action": {
    "type": "ADD_TO_CART",
    "productId": 1,
    "quantity": 1
  }
}

==================================================
FINAL RULE
==================================================

Always return valid JSON.
Always use exact catalog information.
Always respond in English.
`;

    /* =====================================================
       GEMINI
    ===================================================== */

    const ai = new GoogleGenAI({
      apiKey,
    });

    console.log(
      "🔥 USING MODEL: gemini-3.6-flash"
    );

    console.log(
      "🔥 Calling Gemini..."
    );

    /*
      IMPORTANT:
      There is ONLY ONE generateContent call here.
    */

    const response =
      await ai.models.generateContent({
        model: "gemini-3.6-flash",

        contents,

        config: {
          systemInstruction,

          responseMimeType:
            "application/json",
        },
      });

    console.log(
      "✅ Gemini response received."
    );

    /* =====================================================
       RAW RESPONSE
    ===================================================== */

    const rawText =
      response.text?.trim();

    console.log(
      "Gemini raw response:",
      rawText
    );

    if (!rawText) {
      console.error(
        "❌ Gemini returned empty response."
      );

      return NextResponse.json(
        {
          message:
            "PharmaAI returned an empty response. Please try again.",
          action: null,
        } satisfies AIResponse,
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       PARSE JSON
    ===================================================== */

    let parsed: unknown = null;

    try {
      parsed = JSON.parse(
        rawText
      );
    } catch (parseError) {
      console.error(
        "❌ Invalid JSON from Gemini."
      );

      console.error(
        parseError
      );

      /*
        Sometimes an API may return JSON surrounded
        by extra characters. Try extracting the object.
      */

      const start =
        rawText.indexOf("{");

      const end =
        rawText.lastIndexOf("}");

      if (
        start !== -1 &&
        end !== -1 &&
        end > start
      ) {
        const extracted =
          rawText.slice(
            start,
            end + 1
          );

        try {
          parsed =
            JSON.parse(
              extracted
            );
        } catch {
          parsed = null;
        }
      }
    }

    /* =====================================================
       INVALID PARSED RESPONSE
    ===================================================== */

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      console.error(
        "❌ Gemini returned invalid JSON object."
      );

      return NextResponse.json(
        {
          message:
            "I received an invalid response from PharmaAI. Please try again.",
          action: null,
        } satisfies AIResponse,
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       EXTRACT RESULT
    ===================================================== */

    const object =
      parsed as Record<
        string,
        unknown
      >;

    const message =
      typeof object.message ===
        "string" &&
      object.message.trim().length > 0
        ? object.message.trim()
        : "How can I help you with our pharmacy products?";

    /* =====================================================
       VALIDATE ACTION
    ===================================================== */

    let action =
      validateAction(
        object.action,
        products
      );

    /* =====================================================
       CART SAFETY
    ===================================================== */

    if (
      action?.productId !==
      undefined
    ) {
      const cartItem =
        cart.find(
          (item) =>
            item.id ===
            action?.productId
        );

      /* Increase */

      if (
        action.type ===
          "INCREASE_QUANTITY" &&
        !cartItem
      ) {
        console.log(
          "Blocked increase action: product not in cart."
        );

        action = null;
      }

      /* Decrease */

      if (
        action?.type ===
          "DECREASE_QUANTITY" &&
        !cartItem
      ) {
        console.log(
          "Blocked decrease action: product not in cart."
        );

        action = null;
      }

      /* Remove */

      if (
        action?.type ===
          "REMOVE_FROM_CART" &&
        !cartItem
      ) {
        console.log(
          "Blocked remove action: product not in cart."
        );

        action = null;
      }
    }

    /* =====================================================
       CHECKOUT SAFETY
    ===================================================== */

    if (
      action?.type ===
        "CONFIRM_ORDER" &&
      cart.length === 0
    ) {
      console.log(
        "Blocked checkout: cart is empty."
      );

      action = null;
    }

    /* =====================================================
       FINAL RESULT
    ===================================================== */

    const result: AIResponse = {
      message,
      action,
    };

    console.log(
      "======================================"
    );

    console.log(
      "✅ FINAL PHARMA AI RESULT"
    );

    console.log(
      result
    );

    console.log(
      "======================================"
    );

    return NextResponse.json(
      result,
      {
        status: 200,
      }
    );
  } catch (error) {
    /* =====================================================
       ERROR HANDLING
    ===================================================== */

    console.error(
      "======================================"
    );

    console.error(
      "❌ PHARMA AI ERROR"
    );

    console.error(
      error
    );

    console.error(
      "======================================"
    );

    let errorMessage =
      "PharmaAI request failed.";

    if (error instanceof Error) {
      errorMessage =
        error.message;
    }

    /*
      Make common Gemini errors easier to understand.
    */

    if (
      errorMessage.includes(
        "404"
      ) ||
      errorMessage.includes(
        "NOT_FOUND"
      )
    ) {
      errorMessage =
        "The Gemini model could not be found. The route is configured for gemini-3.6-flash. Please restart the Next.js server and try again.";
    }

    if (
      errorMessage.includes(
        "401"
      ) ||
      errorMessage.includes(
        "403"
      ) ||
      errorMessage
        .toLowerCase()
        .includes("api key")
    ) {
      errorMessage =
        "Gemini API authentication failed. Please check your GEMINI_API_KEY.";
    }

    return NextResponse.json(
      {
        message:
          `PharmaAI Error: ${errorMessage}`,
        action: null,
      } satisfies AIResponse,
      {
        status: 500,
      }
    );
  }
}