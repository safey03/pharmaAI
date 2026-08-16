import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

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

const ALLOWED_ACTIONS: ActionType[] = [
  "ADD_TO_CART",
  "INCREASE_QUANTITY",
  "DECREASE_QUANTITY",
  "SET_QUANTITY",
  "REMOVE_FROM_CART",
  "CONFIRM_ORDER",
];

function cleanJsonText(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function isValidProductId(
  productId: unknown,
  products: Product[]
): productId is number {
  return (
    typeof productId === "number" &&
    Number.isInteger(productId) &&
    products.some(
      (product) => product.id === productId
    )
  );
}

function isValidQuantity(
  quantity: unknown
): quantity is number {
  return (
    typeof quantity === "number" &&
    Number.isFinite(quantity) &&
    Number.isInteger(quantity) &&
    quantity > 0
  );
}

function validateAction(
  rawAction: unknown,
  products: Product[]
): AIAction | null {
  if (
    !rawAction ||
    typeof rawAction !== "object"
  ) {
    return null;
  }

  const possibleAction =
    rawAction as Partial<AIAction>;

  if (
    typeof possibleAction.type !==
    "string"
  ) {
    return null;
  }

  if (
    !ALLOWED_ACTIONS.includes(
      possibleAction.type as ActionType
    )
  ) {
    return null;
  }

  const type =
    possibleAction.type as ActionType;

  /*
   * CONFIRM_ORDER does not need productId.
   */
  if (type === "CONFIRM_ORDER") {
    return {
      type,
    };
  }

  /*
   * All other actions require a valid product.
   */
  if (
    !isValidProductId(
      possibleAction.productId,
      products
    )
  ) {
    return null;
  }

  const action: AIAction = {
    type,
    productId:
      possibleAction.productId,
  };

  /*
   * ADD_TO_CART
   */
  if (type === "ADD_TO_CART") {
    action.quantity = isValidQuantity(
      possibleAction.quantity
    )
      ? possibleAction.quantity
      : 1;

    return action;
  }

  /*
   * SET_QUANTITY requires quantity.
   */
  if (type === "SET_QUANTITY") {
    if (
      !isValidQuantity(
        possibleAction.quantity
      )
    ) {
      return null;
    }

    action.quantity =
      possibleAction.quantity;

    return action;
  }

  /*
   * Increase / decrease / remove.
   */
  return action;
}

function buildCatalog(
  products: Product[]
) {
  if (products.length === 0) {
    return "No products are currently available.";
  }

  return products
    .map(
      (product) =>
        `${product.id}. ${product.name} | Category: ${product.category} | Price: EGP ${product.price} | Description: ${
          product.description ?? ""
        }`
    )
    .join("\n");
}

function buildCartText(
  cart: CartItem[]
) {
  if (cart.length === 0) {
    return "The cart is currently empty.";
  }

  return cart
    .map(
      (item) =>
        `${item.name} | quantity: ${item.quantity} | unit price: EGP ${item.price} | subtotal: EGP ${
          item.price * item.quantity
        }`
    )
    .join("\n");
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * 1. API KEY
     */
    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY is missing."
      );

      return NextResponse.json(
        {
          message:
            "Gemini API key is missing. Please add GEMINI_API_KEY to your environment variables.",
          action: null,
        },
        { status: 500 }
      );
    }

    /*
     * 2. BODY
     */
    const body =
      await request.json();

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

    if (messages.length === 0) {
      return NextResponse.json(
        {
          message:
            "Please send a message.",
          action: null,
        },
        { status: 400 }
      );
    }

    /*
     * 3. SANITIZE MESSAGES
     */
    const contents = messages
      .filter(
        (message) =>
          message &&
          typeof message.content ===
            "string" &&
          message.content.trim().length >
            0
      )
      .map((message) => ({
        role:
          message.role === "user"
            ? "user"
            : "model",
        parts: [
          {
            text: message.content.trim(),
          },
        ],
      }));

    if (contents.length === 0) {
      return NextResponse.json(
        {
          message:
            "Please send a valid message.",
          action: null,
        },
        { status: 400 }
      );
    }

    /*
     * 4. CATALOG
     */
    const catalog =
      buildCatalog(products);

    /*
     * 5. CART
     */
    const cartText =
      buildCartText(cart);

    /*
     * 6. CART TOTAL
     */
    const cartTotal = cart.reduce(
      (total, item) =>
        total +
        item.price * item.quantity,
      0
    );

    /*
     * 7. SYSTEM INSTRUCTION
     */
    const systemInstruction = `
You are PharmaAI, the AI assistant for a pharmacy website.

Your job is to help customers with the pharmacy catalog and shopping cart.

IMPORTANT RULES:

1. Only answer questions related to:
- Pharmacy products
- Treatments
- Cosmetics
- Product prices
- Product availability
- Product descriptions
- The customer's shopping cart
- Adding products to the cart
- Removing products from the cart
- Changing product quantities
- Preparing an order for confirmation

2. NEVER invent a product.

3. NEVER invent a price.

4. ONLY use products from the catalog provided below.

5. Always use the exact product ID from the catalog when returning a cart action.

6. If the customer asks to add a product, return ADD_TO_CART.

7. If the customer asks to increase a quantity, return INCREASE_QUANTITY.

8. If the customer asks to decrease a quantity, return DECREASE_QUANTITY.

9. If the customer specifies an exact quantity, return SET_QUANTITY.

10. If the customer asks to remove a product, return REMOVE_FROM_CART.

11. Only return CONFIRM_ORDER when the customer clearly says they want to proceed to checkout, confirm the order, or place the order.

12. NEVER return CONFIRM_ORDER merely because the user asks about the total, cart, products, or prices.

13. Do NOT claim that an order was placed. The website itself handles final order confirmation.

14. When the user asks about the cart, use the CURRENT CART information below.

15. Keep responses short and helpful.

16. If the user asks something unrelated to pharmacy products or cosmetics, politely explain that PharmaAI only handles pharmacy products and cosmetics.

17. Always respond in English.

18. Your entire response MUST be valid JSON.

19. Do not use Markdown.

20. Do not use code fences.

CATALOG:
${catalog}

CURRENT CART:
${cartText}

CURRENT CART TOTAL:
EGP ${cartTotal}

RESPONSE FORMAT:

{
  "message": "Your answer here",
  "action": null
}

OR:

{
  "message": "Your answer here",
  "action": {
    "type": "ADD_TO_CART",
    "productId": 1,
    "quantity": 1
  }
}

ALLOWED ACTIONS:

ADD_TO_CART:
{
  "message": "Panadol Extra has been added to your cart.",
  "action": {
    "type": "ADD_TO_CART",
    "productId": 1,
    "quantity": 1
  }
}

INCREASE_QUANTITY:
{
  "message": "I increased the quantity of Panadol Extra.",
  "action": {
    "type": "INCREASE_QUANTITY",
    "productId": 1
  }
}

DECREASE_QUANTITY:
{
  "message": "I decreased the quantity of Panadol Extra.",
  "action": {
    "type": "DECREASE_QUANTITY",
    "productId": 1
  }
}

SET_QUANTITY:
{
  "message": "The quantity has been updated.",
  "action": {
    "type": "SET_QUANTITY",
    "productId": 1,
    "quantity": 3
  }
}

REMOVE_FROM_CART:
{
  "message": "Panadol Extra has been removed from your cart.",
  "action": {
    "type": "REMOVE_FROM_CART",
    "productId": 1
  }
}

CONFIRM_ORDER:
{
  "message": "Your order is ready for confirmation.",
  "action": {
    "type": "CONFIRM_ORDER"
  }
}

If the customer only asks about the cart, do NOT return an action.

Example:

{
  "message": "Your cart contains Panadol Extra x2 and Cataflam 50mg x1. Your current total is EGP 155.",
  "action": null
}
`;

    /*
     * 8. GEMINI CLIENT
     */
    const ai = new GoogleGenAI({
      apiKey,
    });

    /*
     * 9. GENERATE CONTENT
     */
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

    /*
     * 10. RESPONSE TEXT
     */
    const rawText =
      response.text?.trim();

    if (!rawText) {
      console.error(
        "Gemini returned an empty response."
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
      "Gemini response:",
      rawText
    );

    /*
     * 11. PARSE JSON
     */
    const cleanedText =
      cleanJsonText(rawText);

    let parsed: Partial<AIResponse>;

    try {
      parsed = JSON.parse(
        cleanedText
      );
    } catch (error) {
      console.error(
        "Invalid Gemini JSON:",
        error
      );

      return NextResponse.json(
        {
          message:
            "I couldn't process that response. Please try again.",
          action: null,
        },
        { status: 200 }
      );
    }

    /*
     * 12. MESSAGE
     */
    const message =
      typeof parsed.message ===
        "string" &&
      parsed.message.trim().length > 0
        ? parsed.message.trim()
        : "How can I help you with our pharmacy products?";

    /*
     * 13. ACTION
     */
    const action =
      validateAction(
        parsed.action,
        products
      );

    /*
     * 14. SAFETY CHECK
     *
     * Do not allow Gemini to claim an
     * order was placed.
     */
    let finalMessage = message;

    if (
      action?.type ===
      "CONFIRM_ORDER"
    ) {
      finalMessage =
        "Your order is ready for confirmation.";
    }

    /*
     * 15. RETURN
     */
    return NextResponse.json({
      message: finalMessage,
      action,
    });
  } catch (error) {
    console.error(
      "PHARMA AI ERROR:",
      error
    );

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