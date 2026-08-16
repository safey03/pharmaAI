"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

type Category = "Treatment" | "Cosmetics";

type Product = {
  id: number;
  name: string;
  category: Category;
  price: number;
  description: string;
  emoji: string;
};

type CartItem = Product & {
  quantity: number;
};

type Action = {
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

type Message = {
  role: "user" | "assistant";
  content: string;
};

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Panadol Extra",
    category: "Treatment",
    price: 45,
    description: "Pain relief and fever reduction.",
    emoji: "💊",
  },
  {
    id: 2,
    name: "Cataflam 50mg",
    category: "Treatment",
    price: 65,
    description: "Anti-inflammatory pain relief.",
    emoji: "💊",
  },
  {
    id: 3,
    name: "Strepsils",
    category: "Treatment",
    price: 35,
    description: "Soothing lozenges for sore throat.",
    emoji: "🍬",
  },
  {
    id: 4,
    name: "Gaviscon",
    category: "Treatment",
    price: 85,
    description: "Relief from heartburn and acid reflux.",
    emoji: "🧴",
  },
  {
    id: 5,
    name: "Vitamin C",
    category: "Treatment",
    price: 120,
    description: "Vitamin C supplement.",
    emoji: "🍊",
  },
  {
    id: 6,
    name: "CeraVe Cleanser",
    category: "Cosmetics",
    price: 450,
    description: "Gentle facial cleanser.",
    emoji: "🧴",
  },
  {
    id: 7,
    name: "CeraVe Moisturizer",
    category: "Cosmetics",
    price: 520,
    description: "Daily moisturizing cream.",
    emoji: "✨",
  },
  {
    id: 8,
    name: "La Roche-Posay Effaclar",
    category: "Cosmetics",
    price: 650,
    description: "Skincare for oily and acne-prone skin.",
    emoji: "🧴",
  },
  {
    id: 9,
    name: "Vichy Shampoo",
    category: "Cosmetics",
    price: 580,
    description: "Hair and scalp care shampoo.",
    emoji: "🫧",
  },
  {
    id: 10,
    name: "Nivea Soft",
    category: "Cosmetics",
    price: 180,
    description: "Light moisturizing cream.",
    emoji: "✨",
  },
];

export default function Home() {
  const [category, setCategory] = useState<"All" | Category>("All");

  const [aiOpen, setAiOpen] = useState(false);

  const [cartOpen, setCartOpen] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [orderConfirmed, setOrderConfirmed] = useState(false);

  const [darkMode, setDarkMode] = useState(true);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm PharmaAI 👋 I can help you with our treatments, cosmetics, prices, availability, and your cart.",
    },
  ]);

  /*
   * Load cart and theme from localStorage.
   */
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("pharma-cart");

      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          setCart(parsedCart);
        }
      }

      const savedTheme = localStorage.getItem("pharma-theme");

      if (savedTheme === "light") {
        setDarkMode(false);
      }
    } catch (error) {
      console.error("Failed to load saved data:", error);
    }
  }, []);

  /*
   * Save cart whenever it changes.
   */
  useEffect(() => {
    localStorage.setItem("pharma-cart", JSON.stringify(cart));
  }, [cart]);

  /*
   * Save theme.
   */
  useEffect(() => {
    localStorage.setItem(
      "pharma-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  const filteredProducts = useMemo(() => {
    if (category === "All") {
      return PRODUCTS;
    }

    return PRODUCTS.filter(
      (product) => product.category === category
    );
  }, [category]);

  const cartCount = useMemo(() => {
    return cart.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }, [cart]);

  /*
   * Add a product to the cart.
   */
  function addToCart(productId: number, quantity = 1) {
    const product = PRODUCTS.find(
      (item) => item.id === productId
    );

    if (!product) return;

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.id === productId
      );

      if (existing) {
        return currentCart.map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity + quantity,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity,
        },
      ];
    });
  }

  /*
   * Increase quantity.
   */
  function increaseQuantity(productId: number) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  }

  /*
   * Decrease quantity.
   */
  function decreaseQuantity(productId: number) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  /*
   * Set exact quantity.
   */
  function setQuantity(productId: number, quantity: number) {
    const safeQuantity = Math.max(
      1,
      Math.floor(quantity)
    );

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: safeQuantity,
            }
          : item
      )
    );
  }

  /*
   * Remove product.
   */
  function removeFromCart(productId: number) {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.id !== productId
      )
    );
  }

  /*
   * Get product name.
   */
  function getProductName(productId?: number) {
    if (!productId) {
      return "product";
    }

    return (
      PRODUCTS.find((product) => product.id === productId)
        ?.name ?? "product"
    );
  }

  /*
   * Execute an action returned by Gemini.
   */
  function executeAIAction(action: Action | null | undefined) {
    if (!action) return;

    const productId = action.productId;

    switch (action.type) {
      case "ADD_TO_CART":
        if (productId) {
          addToCart(
            productId,
            action.quantity && action.quantity > 0
              ? action.quantity
              : 1
          );
        }
        break;

      case "INCREASE_QUANTITY":
        if (productId) {
          increaseQuantity(productId);
        }
        break;

      case "DECREASE_QUANTITY":
        if (productId) {
          decreaseQuantity(productId);
        }
        break;

      case "SET_QUANTITY":
        if (
          productId &&
          typeof action.quantity === "number"
        ) {
          setQuantity(productId, action.quantity);
        }
        break;

      case "REMOVE_FROM_CART":
        if (productId) {
          removeFromCart(productId);
        }
        break;

      case "CONFIRM_ORDER":
        setCheckoutOpen(true);
        break;

      default:
        break;
    }
  }

  /*
   * Build cart information for Gemini.
   */
  function getCartForAI() {
    if (cart.length === 0) {
      return "The cart is currently empty.";
    }

    return cart
      .map(
        (item) =>
          `${item.name} | quantity: ${item.quantity} | unit price: EGP ${item.price}`
      )
      .join("\n");
  }

  /*
   * Send message to PharmaAI.
   */
  async function sendMessage(
    customMessage?: string
  ) {
    const messageText = (
      customMessage ?? input
    ).trim();

    if (!messageText || loading) {
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: messageText,
    };

    /*
     * IMPORTANT:
     * We create the updated messages BEFORE sending them.
     * This fixes the problem where the latest user message
     * was sometimes missing from the request.
     */
    const updatedMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(updatedMessages);

    setInput("");

    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          messages: updatedMessages,

          products: PRODUCTS.map(
            ({
              id,
              name,
              category,
              price,
            }) => ({
              id,
              name,
              category,
              price,
            })
          ),

          cart: cart.map(
            ({
              id,
              name,
              quantity,
              price,
            }) => ({
              id,
              name,
              quantity,
              price,
            })
          ),

          cartText: getCartForAI(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "AI request failed"
        );
      }

      const assistantMessage: Message = {
        role: "assistant",
        content:
          data?.message ||
          "I couldn't generate a response.",
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        assistantMessage,
      ]);

      /*
       * Execute action returned from Gemini.
       */
      if (data?.action) {
        executeAIAction(data.action);
      }
    } catch (error) {
      console.error("AI request failed:", error);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't connect to PharmaAI right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    sendMessage();
  }

  function askAboutProduct(product: Product) {
    setAiOpen(true);

    sendMessage(
      `Tell me about ${product.name} and its price.`
    );
  }

  function clearChat() {
    setMessages([
      {
        role: "assistant",
        content:
          "Hi! I'm PharmaAI 👋 I can help you with our treatments, cosmetics, prices, availability, and your cart.",
      },
    ]);
  }

  return (
    <main
      className={
        darkMode
          ? "app dark"
          : "app light"
      }
    >
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family:
            Inter,
            Arial,
            Helvetica,
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        .app {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(126, 255, 0, 0.08),
              transparent 30%
            ),
            #07111f;
          color: #ffffff;
          transition: 0.3s;
        }

        .app.light {
          background: #f5f8fc;
          color: #102033;
        }

        .container {
          width: min(1180px, 92%);
          margin: auto;
        }

        .navbar {
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(20px);
          background: rgba(7, 17, 31, 0.8);
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .light .navbar {
          background: rgba(255,255,255,.85);
          border-bottom-color: rgba(0,0,0,.08);
        }

        .nav-inner {
          height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 800;
          font-size: 20px;
        }

        .logo-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: #8cff00;
          color: #07111f;
          font-size: 25px;
          font-weight: 900;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .icon-btn {
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(255,255,255,.05);
          color: inherit;
          width: 44px;
          height: 44px;
          border-radius: 14px;
          cursor: pointer;
          transition: .2s;
        }

        .icon-btn:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,.1);
        }

        .cart-btn {
          position: relative;
          border: 0;
          background: #8cff00;
          color: #07111f;
          padding: 12px 18px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 800;
        }

        .cart-badge {
          position: absolute;
          right: -6px;
          top: -7px;
          min-width: 21px;
          height: 21px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #ff4f6d;
          color: white;
          font-size: 11px;
        }

        .hero {
          padding: 90px 0 55px;
          text-align: center;
        }

        .hero-badge {
          display: inline-flex;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(140,255,0,.1);
          color: #8cff00;
          border: 1px solid rgba(140,255,0,.2);
          font-size: 13px;
          font-weight: 700;
        }

        .hero h1 {
          font-size: clamp(42px, 7vw, 78px);
          line-height: .98;
          margin: 20px auto;
          max-width: 900px;
          letter-spacing: -3px;
        }

        .hero h1 span {
          color: #8cff00;
        }

        .hero p {
          max-width: 650px;
          margin: auto;
          opacity: .7;
          font-size: 17px;
          line-height: 1.7;
        }

        .filters {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 35px;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 11px 20px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(255,255,255,.04);
          color: inherit;
          cursor: pointer;
        }

        .filter-btn.active {
          background: #8cff00;
          color: #07111f;
          border-color: #8cff00;
          font-weight: 800;
        }

        .products {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          padding-bottom: 90px;
        }

        .product {
          border-radius: 24px;
          padding: 20px;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(255,255,255,.08);
          transition: .25s;
        }

        .light .product {
          background: white;
          border-color: rgba(0,0,0,.06);
          box-shadow: 0 10px 30px rgba(20,40,60,.06);
        }

        .product:hover {
          transform: translateY(-5px);
        }

        .product-image {
          height: 180px;
          border-radius: 18px;
          background: rgba(255,255,255,.05);
          display: grid;
          place-items: center;
          font-size: 70px;
          margin-bottom: 18px;
        }

        .product-category {
          color: #8cff00;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .product h3 {
          margin: 8px 0;
        }

        .product p {
          opacity: .6;
          min-height: 44px;
          line-height: 1.5;
        }

        .product-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
        }

        .price {
          font-size: 20px;
          font-weight: 900;
        }

        .product-actions {
          display: flex;
          gap: 7px;
        }

        .add-btn,
        .ask-btn {
          border: 0;
          border-radius: 12px;
          padding: 10px 13px;
          cursor: pointer;
          font-weight: 700;
        }

        .add-btn {
          background: #8cff00;
          color: #07111f;
        }

        .ask-btn {
          background: rgba(255,255,255,.08);
          color: inherit;
        }

        .ai-button {
          position: fixed;
          right: 25px;
          bottom: 25px;
          z-index: 50;
          border: 0;
          border-radius: 18px;
          padding: 15px 20px;
          background: #8cff00;
          color: #07111f;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 15px 40px rgba(0,0,0,.3);
        }

        .ai-panel {
          position: fixed;
          right: 25px;
          bottom: 90px;
          width: min(430px, calc(100vw - 30px));
          height: min(650px, calc(100vh - 120px));
          z-index: 60;
          display: flex;
          flex-direction: column;
          border-radius: 26px;
          overflow: hidden;
          background: #0d1b2d;
          border: 1px solid rgba(255,255,255,.1);
          box-shadow: 0 30px 80px rgba(0,0,0,.45);
        }

        .ai-header {
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .ai-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ai-logo {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: #8cff00;
          color: #07111f;
          font-weight: 900;
          font-size: 24px;
        }

        .online {
          font-size: 11px;
          opacity: .5;
        }

        .online-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          background: #8cff00;
          border-radius: 50%;
          margin-right: 5px;
        }

        .close-ai {
          border: 0;
          background: rgba(255,255,255,.06);
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          cursor: pointer;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .message-row {
          display: flex;
          margin-bottom: 14px;
        }

        .message-row.user {
          justify-content: flex-end;
        }

        .message {
          max-width: 85%;
          padding: 12px 15px;
          border-radius: 17px;
          line-height: 1.5;
          font-size: 14px;
        }

        .message.assistant {
          background: rgba(255,255,255,.07);
        }

        .message.user {
          background: #8cff00;
          color: #07111f;
          border-bottom-right-radius: 5px;
        }

        .message.assistant {
          border-bottom-left-radius: 5px;
        }

        .typing {
          opacity: .6;
          font-size: 13px;
          padding: 8px 2px;
        }

        .quick-actions {
          padding: 10px 15px;
          display: flex;
          gap: 7px;
          overflow-x: auto;
          border-top: 1px solid rgba(255,255,255,.06);
        }

        .quick-btn {
          white-space: nowrap;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(255,255,255,.04);
          color: white;
          padding: 9px 12px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 12px;
        }

        .input-area {
          padding: 12px 15px 16px;
        }

        .input-form {
          display: flex;
          gap: 8px;
        }

        .chat-input {
          flex: 1;
          min-width: 0;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(255,255,255,.05);
          color: white;
          outline: none;
          border-radius: 14px;
          padding: 13px;
        }

        .send-btn {
          width: 48px;
          border: 0;
          border-radius: 14px;
          background: #8cff00;
          color: #07111f;
          cursor: pointer;
          font-size: 19px;
          font-weight: 900;
        }

        .send-btn:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .disclaimer {
          font-size: 10px;
          opacity: .35;
          margin-top: 8px;
        }

        .cart-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.55);
          z-index: 70;
        }

        .cart-panel {
          position: absolute;
          right: 0;
          top: 0;
          height: 100%;
          width: min(440px, 100%);
          background: #0d1b2d;
          padding: 25px;
          overflow-y: auto;
        }

        .cart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .cart-item {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 15px 0;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .quantity {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
        }

        .quantity button {
          width: 28px;
          height: 28px;
          border: 0;
          border-radius: 8px;
          background: rgba(255,255,255,.08);
          color: white;
          cursor: pointer;
        }

        .checkout {
          width: 100%;
          border: 0;
          border-radius: 14px;
          padding: 14px;
          margin-top: 20px;
          background: #8cff00;
          color: #07111f;
          font-weight: 900;
          cursor: pointer;
        }

        .empty {
          text-align: center;
          opacity: .5;
          padding: 60px 10px;
        }

        @media (max-width: 850px) {
          .products {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 580px) {
          .products {
            grid-template-columns: 1fr;
          }

          .hero {
            padding-top: 60px;
          }

          .nav-inner {
            height: 68px;
          }

          .ai-panel {
            right: 10px;
            bottom: 80px;
            width: calc(100vw - 20px);
          }

          .ai-button {
            right: 15px;
            bottom: 15px;
          }
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="container nav-inner">
          <div className="logo">
            <div className="logo-icon">+</div>

            <div>
              <div>PharmaAI</div>
              <small
                style={{
                  opacity: 0.45,
                  fontSize: 10,
                }}
              >
                Smart Pharmacy
              </small>
            </div>
          </div>

          <div className="nav-actions">
            <button
              className="icon-btn"
              onClick={() =>
                setDarkMode((value) => !value)
              }
              title="Toggle theme"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            <button
              className="cart-btn"
              onClick={() => setCartOpen(true)}
            >
              🛒 Cart

              {cartCount > 0 && (
                <span className="cart-badge">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero container">
        <div className="hero-badge">
          ✨ Smart Pharmacy Assistant
        </div>

        <h1>
          Your Pharmacy,
          <br />
          <span>Smarter.</span>
        </h1>

        <p>
          Find treatments and cosmetics, check prices,
          and manage your cart with PharmaAI.
        </p>
      </section>

      {/* PRODUCTS */}
      <section className="container">
        <div className="filters">
          {(
            ["All", "Treatment", "Cosmetics"] as const
          ).map((item) => (
            <button
              key={item}
              className={
                category === item
                  ? "filter-btn active"
                  : "filter-btn"
              }
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="products">
          {filteredProducts.map((product) => (
            <article
              className="product"
              key={product.id}
            >
              <div className="product-image">
                {product.emoji}
              </div>

              <div className="product-category">
                {product.category}
              </div>

              <h3>{product.name}</h3>

              <p>{product.description}</p>

              <div className="product-bottom">
                <div className="price">
                  EGP {product.price}
                </div>

                <div className="product-actions">
                  <button
                    className="ask-btn"
                    onClick={() =>
                      askAboutProduct(product)
                    }
                  >
                    Ask AI
                  </button>

                  <button
                    className="add-btn"
                    onClick={() =>
                      addToCart(product.id)
                    }
                  >
                    Add
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* AI BUTTON */}
      {!aiOpen && (
        <button
          className="ai-button"
          onClick={() => setAiOpen(true)}
        >
          ✨ Ask PharmaAI
        </button>
      )}

      {/* AI CHAT */}
      {aiOpen && (
        <div className="ai-panel">
          <div className="ai-header">
            <div className="ai-title">
              <div className="ai-logo">+</div>

              <div>
                <strong>PharmaAI</strong>

                <div className="online">
                  <span className="online-dot" />
                  AI Assistant Online
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 7,
              }}
            >
              <button
                className="close-ai"
                onClick={clearChat}
                title="Clear chat"
              >
                ↻
              </button>

              <button
                className="close-ai"
                onClick={() => setAiOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="messages">
            {messages.map(
              (message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === "user"
                      ? "message-row user"
                      : "message-row"
                  }
                >
                  <div
                    className={
                      message.role === "user"
                        ? "message user"
                        : "message assistant"
                    }
                  >
                    {message.content}
                  </div>
                </div>
              )
            )}

            {loading && (
              <div className="typing">
                PharmaAI is thinking...
              </div>
            )}
          </div>

          <div className="quick-actions">
            <button
              className="quick-btn"
              onClick={() =>
                sendMessage(
                  "Show me the treatments available."
                )
              }
            >
              💊 Treatments
            </button>

            <button
              className="quick-btn"
              onClick={() =>
                sendMessage(
                  "Show me the cosmetics available."
                )
              }
            >
              ✨ Cosmetics
            </button>

            <button
              className="quick-btn"
              onClick={() =>
                sendMessage(
                  "Show me the prices of all products."
                )
              }
            >
              💰 Prices
            </button>

            <button
              className="quick-btn"
              onClick={() =>
                sendMessage(
                  "Show me what's currently in my cart."
                )
              }
            >
              🛒 My Cart
            </button>
          </div>

          <div className="input-area">
            <form
              className="input-form"
              onSubmit={handleSubmit}
            >
              <input
                className="chat-input"
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                placeholder="Ask about a product..."
                disabled={loading}
              />

              <button
                className="send-btn"
                type="submit"
                disabled={
                  loading || !input.trim()
                }
              >
                ↑
              </button>
            </form>

            <div className="disclaimer">
              Product information only • General
              information does not replace a doctor or
              pharmacist.
            </div>
          </div>
        </div>
      )}

      {/* CART */}
      {cartOpen && (
        <div
          className="cart-overlay"
          onClick={() => setCartOpen(false)}
        >
          <aside
            className="cart-panel"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="cart-header">
              <h2>Your Cart</h2>

              <button
                className="close-ai"
                onClick={() =>
                  setCartOpen(false)
                }
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty">
                🛒
                <br />
                Your cart is empty.
              </div>
            ) : (
              <>
                {cart.map((item) => (
                  <div
                    className="cart-item"
                    key={item.id}
                  >
                    <div>
                      <strong>
                        {item.name}
                      </strong>

                      <div
                        style={{
                          opacity: 0.6,
                          marginTop: 5,
                        }}
                      >
                        EGP {item.price}
                      </div>

                      <div className="quantity">
                        <button
                          onClick={() =>
                            decreaseQuantity(
                              item.id
                            )
                          }
                        >
                          −
                        </button>

                        <strong>
                          {item.quantity}
                        </strong>

                        <button
                          onClick={() =>
                            increaseQuantity(
                              item.id
                            )
                          }
                        >
                          +
                        </button>

                        <button
                          style={{
                            marginLeft: 8,
                            width: "auto",
                            padding: "0 8px",
                          }}
                          onClick={() =>
                            removeFromCart(
                              item.id
                            )
                          }
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    <strong>
                      EGP{" "}
                      {item.price *
                        item.quantity}
                    </strong>
                  </div>
                ))}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    marginTop: 25,
                    fontSize: 20,
                  }}
                >
                  <strong>Total</strong>

                  <strong>
                    EGP {cartTotal}
                  </strong>
                </div>

                <button
                  className="checkout"
                  onClick={() =>
                    setCheckoutOpen(true)
                  }
                >
                  Proceed to Checkout
                </button>
              </>
            )}
          </aside>
        </div>
      )}

      {/* CHECKOUT */}
      {checkoutOpen && (
        <div
          className="cart-overlay"
          onClick={() =>
            setCheckoutOpen(false)
          }
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform:
                "translate(-50%, -50%)",
              width: "min(420px, 90%)",
              background: "#0d1b2d",
              padding: 30,
              borderRadius: 25,
              textAlign: "center",
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {!orderConfirmed ? (
              <>
                <div
                  style={{
                    fontSize: 50,
                  }}
                >
                  🛍️
                </div>

                <h2>
                  Confirm Your Order
                </h2>

                <p
                  style={{
                    opacity: 0.6,
                    lineHeight: 1.6,
                  }}
                >
                  Your total is{" "}
                  <strong>
                    EGP {cartTotal}
                  </strong>
                  .
                </p>

                <button
                  className="checkout"
                  onClick={() => {
                    setOrderConfirmed(
                      true
                    );
                    setCart([]);
                  }}
                >
                  Confirm Order
                </button>

                <button
                  className="checkout"
                  style={{
                    marginTop: 10,
                    background:
                      "rgba(255,255,255,.08)",
                    color: "white",
                  }}
                  onClick={() =>
                    setCheckoutOpen(false)
                  }
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 60,
                  }}
                >
                  ✅
                </div>

                <h2>
                  Order Confirmed
                </h2>

                <p
                  style={{
                    opacity: 0.6,
                  }}
                >
                  Thank you for shopping with
                  PharmaAI.
                </p>

                <button
                  className="checkout"
                  onClick={() => {
                    setCheckoutOpen(
                      false
                    );
                    setOrderConfirmed(
                      false
                    );
                  }}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}