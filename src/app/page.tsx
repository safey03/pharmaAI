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
  image: string;
};

type CartItem = Product & {
  quantity: number;
};

type ActionType =
  | "ADD_TO_CART"
  | "INCREASE_QUANTITY"
  | "DECREASE_QUANTITY"
  | "SET_QUANTITY"
  | "REMOVE_FROM_CART"
  | "CONFIRM_ORDER";

type Action = {
  type: ActionType;
  productId?: number;
  quantity?: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

/*
|--------------------------------------------------------------------------
| PRODUCTS
|--------------------------------------------------------------------------
| الصور موجودة داخل:
| public/products/
|
| لذلك نستخدم:
| /products/filename.jpg
|--------------------------------------------------------------------------
*/

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Panadol Extra",
    category: "Treatment",
    price: 45,
    description: "Pain relief and fever reduction.",
    emoji: "💊",
    image: "/products/panadol-extra.jpg",
  },

  {
    id: 2,
    name: "Cataflam 50mg",
    category: "Treatment",
    price: 65,
    description: "Anti-inflammatory pain relief.",
    emoji: "💊",
    image: "/products/cataflam-50mg.jpg",
  },

  {
    id: 3,
    name: "Strepsils",
    category: "Treatment",
    price: 35,
    description: "Soothing lozenges for sore throat.",
    emoji: "🍬",
    image: "/products/strepsils.jpg",
  },

  {
    id: 4,
    name: "Gaviscon",
    category: "Treatment",
    price: 85,
    description: "Relief from heartburn and acid reflux.",
    emoji: "🧴",
    image: "/products/gaviscon.jpg",
  },

  {
    id: 5,
    name: "Vitamin C 1000mg",
    category: "Treatment",
    price: 120,
    description: "Vitamin C supplement.",
    emoji: "🍊",
    image: "/products/vitamin-c-1000mg.jpg",
  },

  {
    id: 6,
    name: "CeraVe Moisturizing Cream",
    category: "Cosmetics",
    price: 450,
    description: "Daily moisturizing cream for dry skin.",
    emoji: "✨",
    image: "/products/cerave-moisturizing-cream.jpg",
  },

  {
    id: 7,
    name: "L'Oreal Revitalift",
    category: "Cosmetics",
    price: 520,
    description: "Anti-aging skincare cream.",
    emoji: "✨",
    image: "/products/loreal-revitalift.jpg",
  },

  {
    id: 8,
    name: "Garnier Vitamin C Serum",
    category: "Cosmetics",
    price: 650,
    description: "Vitamin C facial serum for brighter-looking skin.",
    emoji: "🧴",
    image: "/products/garnier-vitamin-c-serum.jpg",
  },

  {
    id: 9,
    name: "Nivea Soft",
    category: "Cosmetics",
    price: 180,
    description: "Light moisturizing cream for face, body and hands.",
    emoji: "✨",
    image: "/products/nivea-soft.jpg",
  },

  {
    id: 10,
    name: "Vaseline Cocoa Glow",
    category: "Cosmetics",
    price: 220,
    description: "Cocoa butter body moisturizer.",
    emoji: "🧴",
    image: "/products/vaseline-cocoa-glow.jpg",
  },
];

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi! I'm PharmaAI 👋 Ask me about our treatments, cosmetics, prices, availability, or your cart.",
};

export default function Home() {
  const [category, setCategory] = useState<"All" | Category>("All");

  const [darkMode, setDarkMode] = useState(true);

  const [aiOpen, setAiOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [messages, setMessages] = useState<Message[]>([
    INITIAL_MESSAGE,
  ]);

  /*
  |--------------------------------------------------------------------------
  | LOAD SAVED DATA
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("pharma-cart");

      if (savedCart) {
        const parsed = JSON.parse(savedCart);

        if (Array.isArray(parsed)) {
          setCart(parsed);
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
  |--------------------------------------------------------------------------
  | SAVE CART
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    try {
      localStorage.setItem("pharma-cart", JSON.stringify(cart));
    } catch (error) {
      console.error("Failed to save cart:", error);
    }
  }, [cart]);

  /*
  |--------------------------------------------------------------------------
  | SAVE THEME
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    try {
      localStorage.setItem(
        "pharma-theme",
        darkMode ? "dark" : "light"
      );
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  }, [darkMode]);

  /*
  |--------------------------------------------------------------------------
  | FILTER PRODUCTS
  |--------------------------------------------------------------------------
  */

  const filteredProducts = useMemo(() => {
    if (category === "All") {
      return PRODUCTS;
    }

    return PRODUCTS.filter(
      (product) => product.category === category
    );
  }, [category]);

  /*
  |--------------------------------------------------------------------------
  | CART COUNT
  |--------------------------------------------------------------------------
  */

  const cartCount = useMemo(() => {
    return cart.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }, [cart]);

  /*
  |--------------------------------------------------------------------------
  | CART TOTAL
  |--------------------------------------------------------------------------
  */

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }, [cart]);

  /*
  |--------------------------------------------------------------------------
  | GET CART QUANTITY
  |--------------------------------------------------------------------------
  */

  function getCartQuantity(productId: number) {
    return (
      cart.find((item) => item.id === productId)
        ?.quantity ?? 0
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ADD TO CART
  |--------------------------------------------------------------------------
  */

  function addToCart(
    productId: number,
    quantity = 1
  ) {
    const product = PRODUCTS.find(
      (item) => item.id === productId
    );

    if (!product) return;

    const safeQuantity =
      Number.isFinite(quantity) && quantity > 0
        ? Math.floor(quantity)
        : 1;

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.id === productId
      );

      if (existing) {
        return currentCart.map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity:
                  item.quantity + safeQuantity,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: safeQuantity,
        },
      ];
    });
  }

  /*
  |--------------------------------------------------------------------------
  | INCREASE
  |--------------------------------------------------------------------------
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
  |--------------------------------------------------------------------------
  | DECREASE
  |--------------------------------------------------------------------------
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
  |--------------------------------------------------------------------------
  | SET QUANTITY
  |--------------------------------------------------------------------------
  */

  function setQuantity(
    productId: number,
    quantity: number
  ) {
    if (!Number.isFinite(quantity)) return;

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
  |--------------------------------------------------------------------------
  | REMOVE
  |--------------------------------------------------------------------------
  */

  function removeFromCart(productId: number) {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.id !== productId
      )
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CLEAR CART
  |--------------------------------------------------------------------------
  */

  function clearCart() {
    setCart([]);
  }

  /*
  |--------------------------------------------------------------------------
  | EXECUTE AI ACTION
  |--------------------------------------------------------------------------
  */

  function executeAIAction(
    action: Action | null | undefined
  ) {
    if (!action) return;

    const productId = action.productId;

    switch (action.type) {
      case "ADD_TO_CART":
        if (typeof productId === "number") {
          addToCart(
            productId,
            typeof action.quantity === "number"
              ? action.quantity
              : 1
          );
        }
        break;

      case "INCREASE_QUANTITY":
        if (typeof productId === "number") {
          increaseQuantity(productId);
        }
        break;

      case "DECREASE_QUANTITY":
        if (typeof productId === "number") {
          decreaseQuantity(productId);
        }
        break;

      case "SET_QUANTITY":
        if (
          typeof productId === "number" &&
          typeof action.quantity === "number"
        ) {
          setQuantity(
            productId,
            action.quantity
          );
        }
        break;

      case "REMOVE_FROM_CART":
        if (typeof productId === "number") {
          removeFromCart(productId);
        }
        break;

      case "CONFIRM_ORDER":
        if (cart.length > 0) {
          setCartOpen(false);
          setCheckoutOpen(true);
          setOrderConfirmed(false);
        } else {
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              content:
                "Your cart is empty. Add a product before checkout.",
            },
          ]);
        }
        break;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SEND MESSAGE
  |--------------------------------------------------------------------------
  */

  async function sendMessage(
    customMessage?: string
  ) {
    const messageText = (
      customMessage ?? input
    ).trim();

    if (!messageText || loading) return;

    const userMessage: Message = {
      role: "user",
      content: messageText,
    };

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

          products: PRODUCTS.map((product) => ({
            id: product.id,
            name: product.name,
            category: product.category,
            price: product.price,
            description: product.description,
          })),

          cart: cart.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });

      const data: {
        message?: string;
        action?: Action | null;
      } = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ?? "AI request failed."
        );
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            data.message?.trim() ||
            "I couldn't generate a response.",
        },
      ]);

      if (data.action) {
        executeAIAction(data.action);
      }
    } catch (error) {
      console.error(
        "PharmaAI request failed:",
        error
      );

      setMessages((current) => [
        ...current,
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

  /*
  |--------------------------------------------------------------------------
  | FORM
  |--------------------------------------------------------------------------
  */

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    void sendMessage();
  }

  /*
  |--------------------------------------------------------------------------
  | ASK ABOUT PRODUCT
  |--------------------------------------------------------------------------
  */

  function askAboutProduct(product: Product) {
    setAiOpen(true);

    void sendMessage(
      `Tell me about ${product.name}, its price, and what it is used for.`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CLEAR CHAT
  |--------------------------------------------------------------------------
  */

  function clearChat() {
    setMessages([INITIAL_MESSAGE]);
  }

  return (
    <main
      className={
        darkMode
          ? "page dark"
          : "page light"
      }
    >
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      {/* =========================================================
          NAVBAR
      ========================================================= */}

      <nav className="navbar">
        <div className="logo">
          <div className="logo-icon">
            +
          </div>

          <div>
            <strong>
              Pharma<span>AI</span>
            </strong>

            <small>
              Smart Pharmacy
            </small>
          </div>
        </div>

        <div className="nav-right">
          <div className="online-status">
            <span />
            AI Online
          </div>

          <button
            className="theme-button"
            type="button"
            onClick={() =>
              setDarkMode((value) => !value)
            }
            title="Toggle theme"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          <button
            className="ai-button"
            type="button"
            onClick={() =>
              setAiOpen((value) => !value)
            }
          >
            <span className="ai-button-icon">
              ✨
            </span>

            PharmaAI
          </button>

          <button
            className="cart-button"
            type="button"
            onClick={() => setCartOpen(true)}
          >
            🛒

            <span>
              Cart
            </span>

            {cartCount > 0 && (
              <span className="cart-count">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* =========================================================
          HERO
      ========================================================= */}

      <section className="hero">
        <div className="hero-text">
          <div className="badge">
            ✦ SMART PHARMACY ASSISTANT
          </div>

          <h1>
            Your Pharmacy.
            <br />
            <span>
              Smarter.
            </span>
          </h1>

          <p>
            Discover treatments and cosmetics,
            check prices, manage your cart, and
            get instant assistance from PharmaAI.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() =>
                document
                  .getElementById("products")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
            >
              Explore Products →
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                setAiOpen(true)
              }
            >
              ✨ Ask PharmaAI
            </button>
          </div>
        </div>

        <div className="hero-card">
          <div className="hero-card-icon">
            ✨
          </div>

          <div>
            <strong>
              PharmaAI Assistant
            </strong>

            <p>
              Ready to help with your pharmacy
              shopping.
            </p>
          </div>

          <div className="hero-card-status">
            <span />
            Online
          </div>
        </div>
      </section>

      {/* =========================================================
          PRODUCTS
      ========================================================= */}

      <section
        className="products-section"
        id="products"
      >
        <div className="section-header">
          <div>
            <div className="section-label">
              PHARMACY CATALOG
            </div>

            <h2>
              Our Products
            </h2>

            <p>
              Choose a product or ask PharmaAI
              about it.
            </p>
          </div>

          <div className="category-menu">
            {(
              [
                "All",
                "Treatment",
                "Cosmetics",
              ] as const
            ).map((item) => (
              <button
                key={item}
                type="button"
                className={
                  category === item
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setCategory(item)
                }
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="products-grid">
          {filteredProducts.map(
            (product) => {
              const quantity =
                getCartQuantity(
                  product.id
                );

              return (
                <article
                  className="product-card"
                  key={product.id}
                >
                  {/* =================================================
                      PRODUCT IMAGE
                  ================================================= */}

                  <div className="product-image-box">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="product-image"
                      loading="lazy"
                      onError={(event) => {
                        /*
                         * لو الصورة مش موجودة
                         * نخفي الصورة ونظهر الـ emoji
                         */
                        event.currentTarget.style.display =
                          "none";

                        const fallback =
                          event.currentTarget
                            .nextElementSibling;

                        if (
                          fallback instanceof
                          HTMLElement
                        ) {
                          fallback.style.display =
                            "flex";
                        }
                      }}
                    />

                    <div
                      className="product-image-fallback"
                      style={{
                        display: "none",
                      }}
                    >
                      <span>
                        {product.emoji}
                      </span>

                      <small>
                        {product.category}
                      </small>
                    </div>

                    <div className="product-image-overlay">
                      {product.category}
                    </div>
                  </div>

                  {/* PRODUCT INFO */}

                  <div className="product-category">
                    {product.category}
                  </div>

                  <h3>
                    {product.name}
                  </h3>

                  <p>
                    {product.description}
                  </p>

                  <div className="product-bottom">
                    <div className="price">
                      <small>
                        PRICE
                      </small>

                      <strong>
                        EGP {product.price}
                      </strong>
                    </div>

                    <button
                      className="ask-product"
                      type="button"
                      onClick={() =>
                        askAboutProduct(
                          product
                        )
                      }
                    >
                      Ask AI
                    </button>

                    {quantity === 0 ? (
                      <button
                        className="add-cart-button"
                        type="button"
                        onClick={() =>
                          addToCart(
                            product.id
                          )
                        }
                        title="Add to cart"
                      >
                        +
                      </button>
                    ) : (
                      <div className="product-quantity">
                        <button
                          type="button"
                          onClick={() =>
                            decreaseQuantity(
                              product.id
                            )
                          }
                        >
                          −
                        </button>

                        <span>
                          {quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            increaseQuantity(
                              product.id
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>

                  {quantity > 0 && (
                    <div className="in-cart-label">
                      ✓ {quantity} in your cart
                    </div>
                  )}
                </article>
              );
            }
          )}
        </div>
      </section>

      {/* =========================================================
          HOW IT WORKS
      ========================================================= */}

      <section className="how-section">
        <div className="section-label">
          SIMPLE & SMART
        </div>

        <h2>
          Pharmacy shopping,
          <span>
            {" "}simplified.
          </span>
        </h2>

        <div className="steps">
          <div className="step">
            <div className="step-number">
              01
            </div>

            <h3>
              Find a product
            </h3>

            <p>
              Browse treatments and cosmetics
              available in our pharmacy.
            </p>
          </div>

          <div className="step">
            <div className="step-number">
              02
            </div>

            <h3>
              Ask PharmaAI
            </h3>

            <p>
              Ask about products, prices,
              quantities, or your cart.
            </p>
          </div>

          <div className="step">
            <div className="step-number">
              03
            </div>

            <h3>
              Checkout
            </h3>

            <p>
              Review your cart and confirm your
              order when you're ready.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          CONTACT
      ========================================================= */}

      <section className="contact-section">
        <div className="section-label">
          PHARMAAI
        </div>

        <h2>
          Need <span>help?</span>
        </h2>

        <div className="contact-grid">
          <div className="contact-card">
            <div className="contact-icon">
              ✨
            </div>

            <div>
              <small>
                AI ASSISTANT
              </small>

              <strong>
                Ask PharmaAI anything about
                our catalog.
              </strong>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-icon">
              💊
            </div>

            <div>
              <small>
                PRODUCTS
              </small>

              <strong>
                Treatments & cosmetics in one
                place.
              </strong>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-icon">
              🛒
            </div>

            <div>
              <small>
                SHOPPING CART
              </small>

              <strong>
                Easily control your quantities
                and total.
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}

      <footer>
        <div className="footer-top">
          <div className="logo">
            <div className="logo-icon">
              +
            </div>

            <div>
              <strong>
                Pharma<span>AI</span>
              </strong>

              <p>
                Smart Pharmacy Experience
              </p>
            </div>
          </div>

          <p>
            Product information only. Always
            consult a healthcare professional
            when appropriate.
          </p>
        </div>

        <div className="footer-line" />

        <div className="footer-bottom">
          <span>
            © 2026 PharmaAI
          </span>

          <span>
            Built with Next.js + Gemini AI
          </span>
        </div>
      </footer>

      {/* =========================================================
          FLOATING AI
      ========================================================= */}

      <button
        className={
          aiOpen
            ? "floating-ai-button opened"
            : "floating-ai-button"
        }
        type="button"
        onClick={() =>
          setAiOpen((value) => !value)
        }
      >
        {aiOpen ? "×" : "✦"}

        {!aiOpen && (
          <span>
            Ask AI
          </span>
        )}
      </button>

      {/* =========================================================
          AI PANEL
      ========================================================= */}

      {aiOpen && (
        <div className="ai-panel">
          <div className="ai-panel-header">
            <div className="ai-profile">
              <div className="ai-avatar">
                ✦
              </div>

              <div>
                <h3>
                  PharmaAI
                </h3>

                <p>
                  <span />
                  AI Assistant Online
                </p>
              </div>
            </div>

            <div className="ai-header-actions">
              <button
                className="close-ai"
                type="button"
                onClick={clearChat}
                title="Clear chat"
              >
                ↻
              </button>

              <button
                className="close-ai"
                type="button"
                onClick={() =>
                  setAiOpen(false)
                }
                title="Close"
              >
                ×
              </button>
            </div>
          </div>

          <div className="ai-messages">
            <div className="ai-info">
              PharmaAI can answer questions about
              our pharmacy products, prices,
              cosmetics, treatments, and cart.
            </div>

            {messages.map(
              (message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === "user"
                      ? "ai-message user"
                      : "ai-message assistant"
                  }
                >
                  {message.role ===
                    "assistant" && (
                    <div className="message-avatar">
                      ✦
                    </div>
                  )}

                  <div className="message-bubble">
                    {message.content}
                  </div>
                </div>
              )
            )}

            {loading && (
              <div className="ai-message assistant">
                <div className="message-avatar">
                  ✦
                </div>

                <div className="message-bubble typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <div className="quick-questions">
            <button
              type="button"
              onClick={() =>
                void sendMessage(
                  "Show me all available treatments."
                )
              }
            >
              💊 Treatments
            </button>

            <button
              type="button"
              onClick={() =>
                void sendMessage(
                  "Show me all available cosmetics."
                )
              }
            >
              ✨ Cosmetics
            </button>

            <button
              type="button"
              onClick={() =>
                void sendMessage(
                  "Show me all product prices."
                )
              }
            >
              💰 Prices
            </button>

            <button
              type="button"
              onClick={() =>
                void sendMessage(
                  "Show me my current cart."
                )
              }
            >
              🛒 My Cart
            </button>
          </div>

          <form
            className="ai-input"
            onSubmit={handleSubmit}
          >
            <input
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              placeholder="Ask PharmaAI..."
              disabled={loading}
              autoComplete="off"
            />

            <button
              type="submit"
              disabled={
                loading || !input.trim()
              }
            >
              ↑
            </button>
          </form>

          <div className="ai-disclaimer">
            Product information only • General
            information does not replace a
            doctor or pharmacist.
          </div>
        </div>
      )}

      {/* =========================================================
          CART
      ========================================================= */}

      {cartOpen && (
        <div
          className="modal-overlay"
          onClick={() =>
            setCartOpen(false)
          }
        >
          <aside
            className="cart-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <small>
                  SHOPPING CART
                </small>

                <h2>
                  Your Cart
                </h2>
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={() =>
                  setCartOpen(false)
                }
              >
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <div>
                  🛒
                </div>

                <h3>
                  Your cart is empty
                </h3>

                <p>
                  Add products from the catalog
                  and they will appear here.
                </p>

                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setCartOpen(false);

                    document
                      .getElementById("products")
                      ?.scrollIntoView({
                        behavior: "smooth",
                      });
                  }}
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div
                      className="cart-item"
                      key={item.id}
                    >
                      {/* CART PRODUCT IMAGE */}

                      <div className="cart-product-image">
                        <img
                          src={item.image}
                          alt={item.name}
                          onError={(event) => {
                            event.currentTarget.style.display =
                              "none";

                            const parent =
                              event.currentTarget
                                .parentElement;

                            if (parent) {
                              parent.textContent =
                                item.emoji;
                            }
                          }}
                        />
                      </div>

                      <div className="cart-item-info">
                        <h3>
                          {item.name}
                        </h3>

                        <p>
                          EGP {item.price} each
                        </p>

                        <div className="quantity">
                          <button
                            type="button"
                            onClick={() =>
                              decreaseQuantity(
                                item.id
                              )
                            }
                          >
                            −
                          </button>

                          <span>
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              increaseQuantity(
                                item.id
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="cart-item-side">
                        <strong className="cart-item-total">
                          EGP{" "}
                          {item.price *
                            item.quantity}
                        </strong>

                        <button
                          className="remove-item"
                          type="button"
                          onClick={() =>
                            removeFromCart(
                              item.id
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <div>
                    <span>
                      Items
                    </span>

                    <strong>
                      {cartCount}
                    </strong>
                  </div>

                  <div className="cart-total">
                    <span>
                      Total
                    </span>

                    <strong>
                      EGP {cartTotal}
                    </strong>
                  </div>

                  <button
                    className="checkout-button"
                    type="button"
                    onClick={() => {
                      setCheckoutOpen(true);
                      setCartOpen(false);
                    }}
                  >
                    Proceed to Checkout
                  </button>

                  <button
                    className="clear-cart-button"
                    type="button"
                    onClick={clearCart}
                  >
                    Clear Cart
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* =========================================================
          CHECKOUT
      ========================================================= */}

      {checkoutOpen && (
        <div
          className="modal-overlay"
          onClick={() =>
            setCheckoutOpen(false)
          }
        >
          <div
            className="checkout-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {!orderConfirmed ? (
              <>
                <div className="checkout-icon">
                  🛍️
                </div>

                <h2>
                  Confirm Your Order
                </h2>

                <p>
                  Your current total is
                  <strong>
                    {" "}
                    EGP {cartTotal}
                  </strong>
                  .
                </p>

                <button
                  className="checkout-button"
                  type="button"
                  onClick={() => {
                    setOrderConfirmed(true);
                    setCart([]);
                  }}
                >
                  Confirm Order
                </button>

                <button
                  className="cancel-button"
                  type="button"
                  onClick={() =>
                    setCheckoutOpen(false)
                  }
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div className="checkout-icon">
                  ✓
                </div>

                <h2>
                  Order Confirmed
                </h2>

                <p>
                  Thank you for shopping with
                  PharmaAI.
                </p>

                <button
                  className="checkout-button"
                  type="button"
                  onClick={() => {
                    setCheckoutOpen(false);
                    setOrderConfirmed(false);
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