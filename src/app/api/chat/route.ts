import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

type Product = {
  id: number;
  name: string;
  category: "Treatment" | "Cosmetics";
  price: number;
  description: string;
};

type CartItem = Product & {
  quantity: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is missing from .env.local",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const messages: Message[] = body.messages || [];
    const products: Product[] = body.products || [];
    const cart: CartItem[] = body.cart || [];

    const productText = products
      .map(
        (product) =>
          `ID: ${product.id}
Name: ${product.name}
Category: ${product.category}
Price: EGP ${product.price}
Description: ${product.description}`
      )
      .join("\n\n");

    const cartText =
      cart.length > 0
        ? cart
            .map(
              (item) =>
                `Product ID: ${item.id}
Product: ${item.name}
Current Quantity: ${item.quantity}
Price: EGP ${item.price}`
            )
            .join("\n\n")
        : "The cart is currently empty.";

    const conversation = messages
      .map(
        (message) =>
          `${message.role === "user" ? "Customer" : "PharmaAI"}: ${
            message.content
          }`
      )
      .join("\n");

    const prompt = `
You are PharmaAI, the AI assistant for a pharmacy website.

IMPORTANT RULES:

1. Only answer questions about the products listed below and the shopping cart.
2. You can explain product name, category, price and description.
3. Do not invent products, prices or information.
4. Do not diagnose medical conditions.
5. Do not prescribe medicines or tell the customer what medicine they should take.
6. If the customer asks for medical advice, politely tell them to ask a doctor or pharmacist.
7. Keep answers short and friendly.
8. You can help the customer manage their shopping cart.
9. The customer can ask you to add, increase, decrease, set or remove quantities.
10. ALWAYS use the exact product ID from the available products.
11. Never invent a product ID.

CART ACTIONS:

If the customer clearly wants to ADD one or more of a product, use:

[ACTION:SET_QUANTITY:PRODUCT_ID:QUANTITY]

Example:
[ACTION:SET_QUANTITY:3:2]

This means product 3 should have quantity 2.

If the customer says:
"add 2 Panadol"
and the current quantity is 1,
the new quantity should be 3.

If the customer says:
"make Panadol 5"
the new quantity should be exactly 5.

If the customer says:
"remove Panadol"
or
"delete Panadol"
use quantity 0.

Example:
[ACTION:SET_QUANTITY:1:0]

12. You can only use ONE SET_QUANTITY action per response.
13. If the customer asks to change multiple products at once, use multiple action lines.

Example:
[ACTION:SET_QUANTITY:1:3]
[ACTION:SET_QUANTITY:3:2]

14. If the customer confirms the entire order, use:

[ACTION:CONFIRM_ORDER]

15. Only use CONFIRM_ORDER when the customer clearly confirms the order.
16. Never confirm an order just because the customer asks about the cart.
17. Never use a quantity below 0.
18. Quantities must be whole numbers.
19. If the customer asks to decrease a quantity, look at the CURRENT CART first and calculate the new quantity.
20. If the requested quantity becomes 0, use quantity 0.
21. If a product is not currently in the cart and the customer says "decrease it", explain that it is not in the cart.
22. If the customer says "add one" to a product already in the cart, increase its current quantity by 1.
23. If the customer says "add 3" to a product already in the cart, increase its current quantity by 3.
24. If the customer says "make it 3", set the quantity to exactly 3.

AVAILABLE PRODUCTS:

${productText}

CURRENT SHOPPING CART:

${cartText}

CONVERSATION:

${conversation}

Answer the customer's latest message.

If you perform a cart action, put the action at the END of your response.
`;

    const ai = new GoogleGenAI({
      apiKey,
    });

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
    });

    const text =
      response.text?.trim() ||
      "Sorry, I couldn't generate a response.";

    const actions: Array<
      | {
          type: "SET_QUANTITY";
          productId: number;
          quantity: number;
        }
      | {
          type: "CONFIRM_ORDER";
        }
    > = [];

    const quantityRegex =
      /\[ACTION:SET_QUANTITY:(\d+):(\d+)\]/g;

    let match;

    while ((match = quantityRegex.exec(text)) !== null) {
      const productId = Number(match[1]);
      const quantity = Math.max(0, Number(match[2]));

      const productExists = products.some(
        (product) => product.id === productId
      );

      if (productExists) {
        actions.push({
          type: "SET_QUANTITY",
          productId,
          quantity,
        });
      }
    }

    if (text.includes("[ACTION:CONFIRM_ORDER]")) {
      actions.push({
        type: "CONFIRM_ORDER",
      });
    }

    const cleanMessage = text
      .replace(
        /\[ACTION:SET_QUANTITY:\d+:\d+\]/g,
        ""
      )
      .replace(
        /\[ACTION:CONFIRM_ORDER\]/g,
        ""
      )
      .trim();

    return NextResponse.json({
      message:
        cleanMessage ||
        "Done! I've updated your cart.",
      actions,
    });
  } catch (error) {
    console.error("PHARMA AI ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown Gemini error",
      },
      { status: 500 }
    );
  }
}