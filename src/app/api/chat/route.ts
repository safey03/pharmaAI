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

type Action =
  | {
      type: "ADD_TO_CART";
      productId: number;
      quantity: number;
    }
  | {
      type: "INCREASE_QUANTITY";
      productId: number;
      quantity: number;
    }
  | {
      type: "DECREASE_QUANTITY";
      productId: number;
      quantity: number;
    }
  | {
      type: "SET_QUANTITY";
      productId: number;
      quantity: number;
    }
  | {
      type: "REMOVE_FROM_CART";
      productId: number;
    }
  | {
      type: "CONFIRM_ORDER";
    };

export async function POST(request: Request) {
  try {
    // =========================================
    // GET GEMINI API KEY
    // =========================================

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is missing. Please add it to Vercel Environment Variables.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // READ REQUEST BODY
    // =========================================

    const body = await request.json();

    const messages: Message[] = Array.isArray(body.messages)
      ? body.messages
      : [];

    const products: Product[] = Array.isArray(body.products)
      ? body.products
      : [];

    const cart: CartItem[] = Array.isArray(body.cart)
      ? body.cart
      : [];

    // =========================================
    // PRODUCTS INFORMATION
    // =========================================

    const productText =
      products.length > 0
        ? products
            .map(
              (product) => `
ID: ${product.id}
Name: ${product.name}
Category: ${product.category}
Price: EGP ${product.price}
Description: ${product.description}
`
            )
            .join("\n")
        : "No products available.";

    // =========================================
    // CURRENT CART
    // =========================================

    const cartText =
      cart.length > 0
        ? cart
            .map(
              (item) => `
Product ID: ${item.id}
Product: ${item.name}
Current Quantity: ${item.quantity}
Price: EGP ${item.price}
`
            )
            .join("\n")
        : "The cart is currently empty.";

    // =========================================
    // CONVERSATION
    // =========================================

    const conversation = messages
      .map(
        (message) =>
          `${
            message.role === "user"
              ? "Customer"
              : "PharmaAI"
          }: ${message.content}`
      )
      .join("\n");

    // =========================================
    // GEMINI PROMPT
    // =========================================

    const prompt = `
You are PharmaAI, an AI shopping assistant for a pharmacy website.

Your job is to help customers with ONLY:

- Pharmacy products listed below
- Product names
- Product categories
- Product prices
- Product descriptions
- Shopping cart
- Adding products to the cart
- Increasing quantities
- Decreasing quantities
- Setting quantities
- Removing products
- Confirming orders

IMPORTANT RULES:

1. Only talk about the products listed below and the shopping cart.

2. Never invent a product.

3. Never invent a price.

4. Never invent a product ID.

5. ALWAYS use the exact Product ID from the AVAILABLE PRODUCTS section.

6. Do not diagnose medical conditions.

7. Do not prescribe medicines.

8. If the customer asks for diagnosis or medical treatment advice, politely tell them to consult a doctor or pharmacist.

9. Keep responses short, clear and friendly.

10. You are a shopping assistant, not a doctor.

=========================================
AVAILABLE PRODUCTS
=========================================

${productText}

=========================================
CURRENT SHOPPING CART
=========================================

${cartText}

=========================================
CART ACTIONS
=========================================

When the customer wants to add a product that is NOT currently in the cart:

Use:

[ACTION:ADD_TO_CART:PRODUCT_ID:QUANTITY]

Example:

[ACTION:ADD_TO_CART:1:1]

If the customer says:

"Add Panadol Extra"

and Panadol Extra is not in the cart, use:

[ACTION:ADD_TO_CART:1:1]

If the customer says:

"Add 3 Panadol Extra"

use:

[ACTION:ADD_TO_CART:1:3]

=========================================

INCREASE QUANTITY
=========================================

If the product is already in the cart and the customer says:

"Add one more Panadol"

use:

[ACTION:INCREASE_QUANTITY:1:1]

If the customer says:

"Add 3 more Panadol"

use:

[ACTION:INCREASE_QUANTITY:1:3]

=========================================

DECREASE QUANTITY
=========================================

If the customer says:

"Decrease Panadol"

use:

[ACTION:DECREASE_QUANTITY:1:1]

If the customer says:

"Remove 2 Panadol"

DO NOT use REMOVE_FROM_CART.

Instead use:

[ACTION:DECREASE_QUANTITY:1:2]

If the resulting quantity becomes zero, the website will remove the product automatically.

=========================================

SET EXACT QUANTITY
=========================================

If the customer says:

"Make Panadol quantity 5"

use:

[ACTION:SET_QUANTITY:1:5]

If the customer says:

"Set Panadol to 3"

use:

[ACTION:SET_QUANTITY:1:3]

=========================================

REMOVE PRODUCT
=========================================

If the customer says:

"Remove Panadol from my cart"

or:

"Delete Panadol"

use:

[ACTION:REMOVE_FROM_CART:1]

=========================================

CONFIRM ORDER
=========================================

ONLY when the customer clearly confirms the entire order, use:

[ACTION:CONFIRM_ORDER]

Examples:

"Confirm my order"

"Place the order"

"Yes, confirm it"

"Checkout"

Do NOT use CONFIRM_ORDER when the customer only asks:

"What is in my cart?"

"Show my cart"

"How much is my cart?"

=========================================

IMPORTANT CART LOGIC
=========================================

Before performing an action, look at CURRENT SHOPPING CART.

If the customer says:

"Add Panadol"

and Panadol is already in the cart:

Use INCREASE_QUANTITY.

If Panadol is not in the cart:

Use ADD_TO_CART.

If the customer says:

"Add 3 Panadol"

and current quantity is 2:

Use:

[ACTION:INCREASE_QUANTITY:1:3]

Do NOT use SET_QUANTITY:1:3.

If the customer says:

"Make Panadol 3"

use:

[ACTION:SET_QUANTITY:1:3]

If the customer says:

"Remove Panadol"

use:

[ACTION:REMOVE_FROM_CART:1]

If the customer says:

"Decrease Panadol by 2"

use:

[ACTION:DECREASE_QUANTITY:1:2]

If the product is not in the cart and the customer asks to decrease it, explain that the product is not currently in the cart.

Never use a negative quantity.

Quantities must always be whole numbers.

=========================================
RESPONSE FORMAT
=========================================

First write a short friendly response to the customer.

Then, if a cart action is needed, put EXACTLY ONE action at the END.

Example:

"Sure! I've added Panadol Extra to your cart.

[ACTION:ADD_TO_CART:1:1]"

Another example:

"Done! I've increased Panadol Extra by 2.

[ACTION:INCREASE_QUANTITY:1:2]"

Another example:

"Your order has been confirmed.

[ACTION:CONFIRM_ORDER]"

Do not explain the action syntax to the customer.

=========================================
CONVERSATION
=========================================

${conversation}

=========================================

Answer the customer's latest message.
`;

    // =========================================
    // GEMINI
    // =========================================

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

    // =========================================
    // PARSE ACTION
    // =========================================

    let action: Action | null = null;

    // -----------------------------------------
    // ADD TO CART
    // -----------------------------------------

    const addMatch = text.match(
      /\[ACTION:ADD_TO_CART:(\d+):(\d+)\]/
    );

    if (addMatch) {
      const productId = Number(addMatch[1]);
      const quantity = Math.max(
        1,
        Number(addMatch[2])
      );

      const productExists = products.some(
        (product) => product.id === productId
      );

      if (productExists) {
        action = {
          type: "ADD_TO_CART",
          productId,
          quantity,
        };
      }
    }

    // -----------------------------------------
    // INCREASE QUANTITY
    // -----------------------------------------

    if (!action) {
      const increaseMatch = text.match(
        /\[ACTION:INCREASE_QUANTITY:(\d+):(\d+)\]/
      );

      if (increaseMatch) {
        const productId = Number(
          increaseMatch[1]
        );

        const quantity = Math.max(
          1,
          Number(increaseMatch[2])
        );

        const productExists = products.some(
          (product) => product.id === productId
        );

        if (productExists) {
          action = {
            type: "INCREASE_QUANTITY",
            productId,
            quantity,
          };
        }
      }
    }

    // -----------------------------------------
    // DECREASE QUANTITY
    // -----------------------------------------

    if (!action) {
      const decreaseMatch = text.match(
        /\[ACTION:DECREASE_QUANTITY:(\d+):(\d+)\]/
      );

      if (decreaseMatch) {
        const productId = Number(
          decreaseMatch[1]
        );

        const quantity = Math.max(
          1,
          Number(decreaseMatch[2])
        );

        const productExists = products.some(
          (product) => product.id === productId
        );

        if (productExists) {
          action = {
            type: "DECREASE_QUANTITY",
            productId,
            quantity,
          };
        }
      }
    }

    // -----------------------------------------
    // SET QUANTITY
    // -----------------------------------------

    if (!action) {
      const setMatch = text.match(
        /\[ACTION:SET_QUANTITY:(\d+):(\d+)\]/
      );

      if (setMatch) {
        const productId = Number(
          setMatch[1]
        );

        const quantity = Math.max(
          0,
          Number(setMatch[2])
        );

        const productExists = products.some(
          (product) => product.id === productId
        );

        if (productExists) {
          action = {
            type: "SET_QUANTITY",
            productId,
            quantity,
          };
        }
      }
    }

    // -----------------------------------------
    // REMOVE FROM CART
    // -----------------------------------------

    if (!action) {
      const removeMatch = text.match(
        /\[ACTION:REMOVE_FROM_CART:(\d+)\]/
      );

      if (removeMatch) {
        const productId = Number(
          removeMatch[1]
        );

        const productExists = products.some(
          (product) => product.id === productId
        );

        if (productExists) {
          action = {
            type: "REMOVE_FROM_CART",
            productId,
          };
        }
      }
    }

    // -----------------------------------------
    // CONFIRM ORDER
    // -----------------------------------------

    if (!action) {
      if (
        text.includes(
          "[ACTION:CONFIRM_ORDER]"
        )
      ) {
        action = {
          type: "CONFIRM_ORDER",
        };
      }
    }

    // =========================================
    // CLEAN AI MESSAGE
    // =========================================

    const cleanMessage = text
      .replace(
        /\[ACTION:ADD_TO_CART:\d+:\d+\]/g,
        ""
      )
      .replace(
        /\[ACTION:INCREASE_QUANTITY:\d+:\d+\]/g,
        ""
      )
      .replace(
        /\[ACTION:DECREASE_QUANTITY:\d+:\d+\]/g,
        ""
      )
      .replace(
        /\[ACTION:SET_QUANTITY:\d+:\d+\]/g,
        ""
      )
      .replace(
        /\[ACTION:REMOVE_FROM_CART:\d+\]/g,
        ""
      )
      .replace(
        /\[ACTION:CONFIRM_ORDER\]/g,
        ""
      )
      .trim();

    // =========================================
    // RETURN RESPONSE
    // =========================================

    return NextResponse.json({
      message:
        cleanMessage ||
        "Done! I've updated your cart.",
      action,
    });
  } catch (error) {
    console.error(
      "PHARMA AI ERROR:",
      error
    );

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