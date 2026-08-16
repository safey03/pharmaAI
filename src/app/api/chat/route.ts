import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

type Product = {
  id: number;
  name: string;
  category: "Treatment" | "Cosmetics";
  price: number;
};

type ChatMessage = {
  role: "user" | "assistant" | "model";
  content: string;
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");

      return NextResponse.json(
        {
          message:
            "Gemini API key is missing. Please add GEMINI_API_KEY to your environment variables.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const messages: ChatMessage[] = Array.isArray(body.messages)
      ? body.messages
      : [];

    const products: Product[] = Array.isArray(body.products)
      ? body.products
      : [];

    if (messages.length === 0) {
      return NextResponse.json(
        {
          message: "Please send a message.",
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    /*
      We convert our frontend message format into
      Gemini's required format.

      Frontend:
      user      -> user
      assistant -> model

      Gemini DOES NOT accept "assistant" as a role.
    */

    const contents = messages
      .filter(
        (message) =>
          message &&
          typeof message.content === "string" &&
          message.content.trim().length > 0
      )
      .map((message) => {
        const role = message.role === "user" ? "user" : "model";

        return {
          role,
          parts: [
            {
              text: message.content,
            },
          ],
        };
      });

    const catalog = products
      .map(
        (product) =>
          `${product.id}. ${product.name} | Category: ${product.category} | Price: EGP ${product.price}`
      )
      .join("\n");

    const systemInstruction = `
You are PharmaAI, the AI assistant for a pharmacy website.

IMPORTANT RULES:

1. You ONLY answer questions related to:
   - Products in the pharmacy catalog
   - Treatments
   - Cosmetics
   - Product prices
   - Product availability
   - The customer's shopping cart
   - Adding/removing/changing products in the cart
   - General safe product information

2. Do NOT invent products.
3. Do NOT invent prices.
4. Use ONLY the products and prices provided in the catalog below.
5. Always respond in ENGLISH.
6. Keep answers helpful and relatively concise.
7. If the user asks for something unrelated to pharmacy products, politely say that PharmaAI only handles pharmacy products and cosmetics.
8. Do not claim that an order has been placed unless the user explicitly confirms it.
9. If the user asks to add a product to the cart, return an action.
10. If the user asks to remove a product, return an action.
11. If the user asks to increase/decrease quantity, return an action.
12. If the user asks about the cart, explain the cart based on the cart information supplied by the website.

CATALOG:
${catalog}

VERY IMPORTANT:

Your response MUST be valid JSON.

Use exactly this structure:

{
  "message": "Your response to the customer",
  "action": null
}

OR when an action is needed:

{
  "message": "Your response to the customer",
  "action": {
    "type": "ADD_TO_CART",
    "productId": 1,
    "quantity": 1
  }
}

Allowed action types:

ADD_TO_CART
INCREASE_QUANTITY
DECREASE_QUANTITY
SET_QUANTITY
REMOVE_FROM_CART
CONFIRM_ORDER

Examples:

Add product:
{
  "message": "Cataflam 50mg has been added to your cart.",
  "action": {
    "type": "ADD_TO_CART",
    "productId": 2,
    "quantity": 1
  }
}

Increase:
{
  "message": "I increased the quantity of Cataflam 50mg.",
  "action": {
    "type": "INCREASE_QUANTITY",
    "productId": 2
  }
}

Decrease:
{
  "message": "I decreased the quantity of Cataflam 50mg.",
  "action": {
    "type": "DECREASE_QUANTITY",
    "productId": 2
  }
}

Set quantity:
{
  "message": "The quantity has been updated.",
  "action": {
    "type": "SET_QUANTITY",
    "productId": 2,
    "quantity": 3
  }
}

Remove:
{
  "message": "Cataflam 50mg has been removed from your cart.",
  "action": {
    "type": "REMOVE_FROM_CART",
    "productId": 2
  }
}

Confirm order:
{
  "message": "Your order is ready for confirmation.",
  "action": {
    "type": "CONFIRM_ORDER"
  }
}

If no cart action is required:

{
  "message": "Your answer here",
  "action": null
}

Never put Markdown outside the JSON.
Never return code fences.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",

      contents,

      config: {
        systemInstruction,

        temperature: 0.2,

        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim();

    if (!text) {
      console.error("Gemini returned empty response");

      return NextResponse.json(
        {
          message: "PharmaAI returned an empty response.",
        },
        { status: 500 }
      );
    }

    console.log("Gemini response:", text);

    let parsed: {
      message?: string;
      action?: {
        type:
          | "ADD_TO_CART"
          | "INCREASE_QUANTITY"
          | "DECREASE_QUANTITY"
          | "SET_QUANTITY"
          | "REMOVE_FROM_CART"
          | "CONFIRM_ORDER";
        productId?: number;
        quantity?: number;
      } | null;
    };

    try {
      parsed = JSON.parse(text);
    } catch (jsonError) {
      console.error("Invalid Gemini JSON:", jsonError);

      /*
        Fallback in case Gemini returns normal text
        instead of JSON.
      */

      return NextResponse.json({
        message: text.replace(/^```json|```$/g, "").trim(),
        action: null,
      });
    }

    return NextResponse.json({
      message:
        typeof parsed.message === "string"
          ? parsed.message
          : "How can I help you with our pharmacy products?",

      action: parsed.action ?? null,
    });
  } catch (error) {
    console.error("PHARMA AI ERROR:", error);

    return NextResponse.json(
      {
        message:
          "Sorry, I couldn't connect to PharmaAI right now. Please try again.",
        action: null,
      },
      {
        status: 500,
      }
    );
  }
}