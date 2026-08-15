"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

type Product = {
  id: number;
  name: string;
  category: "Treatment" | "Cosmetics";
  price: number;
  description: string;
  image: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

type CartItem = Product & {
  quantity: number;
};

const products: Product[] = [
  {
    id: 1,
    name: "Panadol Extra",
    category: "Treatment",
    price: 75,
    description: "Pain and fever relief",
    image: "/products/panadol-extra.jpg",
  },
  {
    id: 2,
    name: "Cataflam 50mg",
    category: "Treatment",
    price: 65,
    description: "Pain and inflammation relief",
    image: "/products/cataflam-50mg.jpg",
  },
  {
    id: 3,
    name: "Strepsils",
    category: "Treatment",
    price: 55,
    description: "Sore throat lozenges",
    image: "/products/strepsils.jpg",
  },
  {
    id: 4,
    name: "Gaviscon",
    category: "Treatment",
    price: 120,
    description: "Heartburn and acid reflux relief",
    image: "/products/gaviscon.jpg",
  },
  {
    id: 5,
    name: "Vitamin C 1000mg",
    category: "Treatment",
    price: 180,
    description: "Vitamin C supplement",
    image: "/products/vitamin-c-1000mg.jpg",
  },
  {
    id: 6,
    name: "Nivea Soft",
    category: "Cosmetics",
    price: 150,
    description: "Moisturizing cream",
    image: "/products/nivea-soft.jpg",
  },
  {
    id: 7,
    name: "CeraVe Moisturizing Cream",
    category: "Cosmetics",
    price: 650,
    description: "Face and body moisturizer",
    image: "/products/cerave-moisturizing-cream.jpg",
  },
  {
    id: 8,
    name: "L'Oréal Revitalift",
    category: "Cosmetics",
    price: 720,
    description: "Anti-aging skincare cream",
    image: "/products/loreal-revitalift.jpg",
  },
  {
    id: 9,
    name: "Garnier Vitamin C Serum",
    category: "Cosmetics",
    price: 390,
    description: "Vitamin C facial serum",
    image: "/products/garnier-vitamin-c-serum.jpg",
  },
  {
    id: 10,
    name: "Vaseline Cocoa Glow",
    category: "Cosmetics",
    price: 180,
    description: "Body moisturizing lotion",
    image: "/products/vaseline-cocoa-glow.jpg",
  },
];

export default function Home() {
  const [category, setCategory] =
    useState<"All" | "Treatment" | "Cosmetics">("All");

  const [aiOpen, setAiOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  // DARK MODE
  const [darkMode, setDarkMode] = useState(true);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello 👋 I'm PharmaAI. Ask me about our products, prices, or your shopping cart.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const filteredProducts =
    category === "All"
      ? products
      : products.filter(
          (product) => product.category === category
        );

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );

  // =========================
  // CART FUNCTIONS
  // =========================

  function addToCart(
    product: Product,
    quantity: number = 1
  ) {
    if (quantity <= 0) return;

    setCart((previous) => {
      const exists = previous.find(
        (item) => item.id === product.id
      );

      if (exists) {
        return previous.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
              }
            : item
        );
      }

      return [
        ...previous,
        {
          ...product,
          quantity,
        },
      ];
    });
  }

  function increaseQuantity(productId: number) {
    setCart((previous) =>
      previous.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  }

  function decreaseQuantity(productId: number) {
    setCart((previous) =>
      previous
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

  function removeFromCart(productId: number) {
    setCart((previous) =>
      previous.filter(
        (item) => item.id !== productId
      )
    );
  }

  function changeQuantity(
    productId: number,
    quantity: number
  ) {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((previous) =>
      previous.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity,
            }
          : item
      )
    );
  }

  // =========================
  // AI
  // =========================

  async function sendMessage(text = input) {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: text.trim(),
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
          products,
          cart,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "AI request failed"
        );
      }

      // =========================
      // AI CART ACTIONS
      // =========================

      if (data.action?.type === "ADD_TO_CART") {
        const product = products.find(
          (item) =>
            item.id === data.action.productId
        );

        if (product) {
          addToCart(
            product,
            data.action.quantity || 1
          );
        }
      }

      if (
        data.action?.type ===
        "INCREASE_QUANTITY"
      ) {
        const product = products.find(
          (item) =>
            item.id === data.action.productId
        );

        if (product) {
          addToCart(
            product,
            data.action.quantity || 1
          );
        }
      }

      if (
        data.action?.type ===
        "DECREASE_QUANTITY"
      ) {
        const currentItem = cart.find(
          (item) =>
            item.id === data.action.productId
        );

        if (currentItem) {
          const amount =
            data.action.quantity || 1;

          changeQuantity(
            currentItem.id,
            currentItem.quantity - amount
          );
        }
      }

      if (
        data.action?.type ===
        "SET_QUANTITY"
      ) {
        changeQuantity(
          data.action.productId,
          data.action.quantity
        );
      }

      if (
        data.action?.type ===
        "REMOVE_FROM_CART"
      ) {
        removeFromCart(
          data.action.productId
        );
      }

      if (
        data.action?.type ===
        "CONFIRM_ORDER"
      ) {
        if (cart.length > 0) {
          setOrderConfirmed(true);
          setCheckoutOpen(false);
          setCartOpen(false);
        }
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            data.message ||
            "Sorry, I couldn't generate a response.",
        },
      ]);
    } catch (error) {
      console.error("AI ERROR:", error);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't connect to PharmaAI right now. Please check your Gemini API key and try again.",
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

  // =========================
  // CHECKOUT
  // =========================

  function confirmOrder() {
    if (cart.length === 0) return;

    setOrderConfirmed(true);
    setCheckoutOpen(false);
    setCartOpen(false);
  }

  return (
    <main
      className={`page ${
        darkMode ? "dark" : "light"
      }`}
    >
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      {/* ================= NAVBAR ================= */}

      <nav className="navbar">
        <div className="logo">
          <div className="logo-icon">
            ✚
          </div>

          <div>
            <strong>
              Pharma<span>AI</span>
            </strong>

            <small>Smart Pharmacy</small>
          </div>
        </div>

        <div className="nav-right">
          <div className="online-status">
            <span />
            Pharmacy Online
          </div>

          {/* THEME BUTTON */}

          <button
            className="theme-button"
            onClick={() =>
              setDarkMode(
                (value) => !value
              )
            }
            aria-label="Toggle theme"
          >
            <span className="theme-icon">
              {darkMode ? "☀" : "☾"}
            </span>
          </button>

          {/* CART BUTTON */}

          <button
            className="cart-button"
            onClick={() =>
              setCartOpen(true)
            }
          >
            🛒
            <span>Cart</span>

            {cartCount > 0 && (
              <b>{cartCount}</b>
            )}
          </button>

          {/* AI BUTTON */}

          <button
            className={`ai-button ${
              aiOpen ? "active" : ""
            }`}
            onClick={() =>
              setAiOpen(
                (value) => !value
              )
            }
          >
            <span className="ai-button-icon">
              ✦
            </span>

            <span>
              {aiOpen
                ? "Close AI"
                : "Ask PharmaAI"}
            </span>
          </button>
        </div>
      </nav>

      {/* ================= HERO ================= */}

      <section className="hero">
        <div className="hero-text">
          <div className="badge">
            ✦ AI POWERED PHARMACY
          </div>

          <h1>
            Your health.
            <br />
            <span>
              Smarter choices.
            </span>
          </h1>

          <p>
            Explore our treatments and
            cosmetics, check prices, add
            products to your cart, and ask
            PharmaAI about our pharmacy.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={() =>
                document
                  .getElementById(
                    "products"
                  )
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
            >
              Explore Products
              <span>→</span>
            </button>

            <button
              className="secondary-button"
              onClick={() =>
                setAiOpen(true)
              }
            >
              Ask AI
              <span>✦</span>
            </button>
          </div>
        </div>

        <div className="hero-card">
          <div className="hero-card-icon">
            ✚
          </div>

          <div>
            <strong>PharmaAI</strong>
            <p>
              Your pharmacy assistant
            </p>
          </div>

          <div className="hero-card-status">
            <span />
            Online
          </div>
        </div>
      </section>

      {/* ================= PRODUCTS ================= */}

      <section
        className="products-section"
        id="products"
      >
        <div className="section-header">
          <div>
            <div className="section-label">
              OUR PRODUCTS
            </div>

            <h2>
              Pharmacy essentials
            </h2>

            <p>
              Treatments and cosmetics
              available in our pharmacy.
            </p>
          </div>

          <div className="category-menu">
            <button
              className={
                category === "All"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setCategory("All")
              }
            >
              All
            </button>

            <button
              className={
                category ===
                "Treatment"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setCategory(
                  "Treatment"
                )
              }
            >
              Treatments
            </button>

            <button
              className={
                category ===
                "Cosmetics"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setCategory(
                  "Cosmetics"
                )
              }
            >
              Cosmetics
            </button>
          </div>
        </div>

        <div className="products-grid">
          {filteredProducts.map(
            (product) => {
              const cartItem =
                cart.find(
                  (item) =>
                    item.id ===
                    product.id
                );

              return (
                <div
                  className="product-card"
                  key={product.id}
                >
                  <div className="product-image-wrapper">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="product-image"
                    />
                  </div>

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
                      <strong>
                        EGP{" "}
                        {product.price}
                      </strong>
                    </div>

                    {cartItem ? (
                      <div className="product-quantity">
                        <button
                          onClick={() =>
                            decreaseQuantity(
                              product.id
                            )
                          }
                        >
                          −
                        </button>

                        <span>
                          {
                            cartItem.quantity
                          }
                        </span>

                        <button
                          onClick={() =>
                            increaseQuantity(
                              product.id
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        className="add-cart-button"
                        onClick={() =>
                          addToCart(
                            product
                          )
                        }
                      >
                        🛒 Add
                      </button>
                    )}

                    <button
                      className="ask-product"
                      onClick={() => {
                        setAiOpen(true);

                        sendMessage(
                          `Tell me about ${product.name} and its price.`
                        );
                      }}
                    >
                      Ask AI →
                    </button>
                  </div>

                  {cartItem && (
                    <div className="added-to-cart">
                      ✓{" "}
                      {
                        cartItem.quantity
                      }{" "}
                      in cart
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}

      <section className="how-section">
        <div className="section-label">
          HOW IT WORKS
        </div>

        <h2>
          Pharmacy made
          <span> simpler.</span>
        </h2>

        <div className="steps">
          <div className="step">
            <div className="step-number">
              01
            </div>

            <h3>
              Browse products
            </h3>

            <p>
              Explore treatments and
              cosmetics available in our
              pharmacy.
            </p>
          </div>

          <div className="step">
            <div className="step-number">
              02
            </div>

            <h3>
              Build your cart
            </h3>

            <p>
              Add products and adjust
              quantities before checkout.
            </p>
          </div>

          <div className="step">
            <div className="step-number">
              03
            </div>

            <h3>
              Ask PharmaAI
            </h3>

            <p>
              Let the AI help you find
              products and manage your
              shopping cart.
            </p>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}

      <footer>
        <div className="footer-brand">
          <div className="logo">
            <div className="logo-icon">
              ✚
            </div>

            <strong>
              Pharma<span>AI</span>
            </strong>
          </div>

          <p>
            Smart pharmacy starts with
            better information.
          </p>
        </div>

        <div className="footer-contact">
          <a
            href="mailto:pharmai@gmail.com"
            className="contact-card"
          >
            <div className="contact-icon">
              ✉
            </div>

            <div>
              <small>Email</small>

              <strong>
                pharmai@gmail.com
              </strong>
            </div>
          </a>

          <a
            href="tel:01098729519"
            className="contact-card"
          >
            <div className="contact-icon">
              ☎
            </div>

            <div>
              <small>Phone</small>

              <strong>
                01098729519
              </strong>
            </div>
          </a>

          <div className="contact-card">
            <div className="contact-icon">
              ⌖
            </div>

            <div>
              <small>Location</small>

              <strong>
                Online Pharmacy
              </strong>
            </div>
          </div>
        </div>
      </footer>

      {/* ================= FLOATING AI ================= */}

      <button
        className={`floating-ai-button ${
          aiOpen ? "opened" : ""
        }`}
        onClick={() =>
          setAiOpen(
            (value) => !value
          )
        }
      >
        ✦
        <span>
          {aiOpen
            ? "Close"
            : "Ask AI"}
        </span>
      </button>

      {/* ================= AI PANEL ================= */}

      {aiOpen && (
        <div className="ai-panel">
          <div className="ai-panel-header">
            <div className="ai-profile">
              <div className="ai-avatar">
                ✚
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

            <button
              className="close-ai"
              onClick={() =>
                setAiOpen(false)
              }
            >
              ×
            </button>
          </div>

          <div className="ai-messages">
            <div className="ai-info">
              PharmaAI can answer product
              questions and help manage
              your shopping cart.
            </div>

            {messages.map(
              (message, index) => (
                <div
                  key={index}
                  className={`ai-message ${
                    message.role ===
                    "user"
                      ? "user"
                      : "assistant"
                  }`}
                >
                  {message.role ===
                    "assistant" && (
                    <div className="message-avatar">
                      ✚
                    </div>
                  )}

                  <div className="message-bubble">
                    {
                      message.content
                    }
                  </div>
                </div>
              )
            )}

            {loading && (
              <div className="ai-message assistant">
                <div className="message-avatar">
                  ✚
                </div>

                <div className="message-bubble typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div
              ref={messagesEndRef}
            />
          </div>

          <div className="quick-questions">
            <button
              onClick={() =>
                sendMessage(
                  "What treatments do you have?"
                )
              }
            >
              💊 Treatments
            </button>

            <button
              onClick={() =>
                sendMessage(
                  "What cosmetics do you have?"
                )
              }
            >
              ✦ Cosmetics
            </button>

            <button
              onClick={() =>
                sendMessage(
                  "Show me the prices of your products."
                )
              }
            >
              💰 Prices
            </button>

            <button
              onClick={() => {
                setCartOpen(true);
                setAiOpen(false);
              }}
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
                setInput(
                  event.target.value
                )
              }
              placeholder="Ask about a product..."
              disabled={loading}
            />

            <button
              type="submit"
              disabled={
                loading ||
                !input.trim()
              }
            >
              ↑
            </button>
          </form>

          <div className="ai-disclaimer">
            Product information only •
            General information does not
            replace a doctor or pharmacist.
          </div>
        </div>
      )}

      {/* =====================================================
          CART MODAL
      ===================================================== */}

      {cartOpen && (
        <div
          className="modal-overlay"
          onClick={() =>
            setCartOpen(false)
          }
        >
          <div
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
                onClick={() =>
                  setCartOpen(false)
                }
              >
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <div>🛒</div>

                <h3>
                  Your cart is empty
                </h3>

                <p>
                  Add some products from
                  the pharmacy menu.
                </p>

                <button
                  className="checkout-button"
                  onClick={() =>
                    setCartOpen(false)
                  }
                >
                  Continue Shopping
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
                      <img
                        src={item.image}
                        alt={item.name}
                      />

                      <div className="cart-item-info">
                        <h3>
                          {item.name}
                        </h3>

                        <p>
                          EGP{" "}
                          {item.price}{" "}
                          each
                        </p>

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

                          <span>
                            {
                              item.quantity
                            }
                          </span>

                          <button
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

                      <div className="cart-item-total">
                        EGP{" "}
                        {item.price *
                          item.quantity}
                      </div>

                      <button
                        className="remove-item"
                        onClick={() =>
                          removeFromCart(
                            item.id
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <div>
                    <span>
                      Total Products
                    </span>

                    <strong>
                      {cartCount}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Total
                    </span>

                    <strong>
                      EGP{" "}
                      {cartTotal}
                    </strong>
                  </div>

                  <button
                    className="checkout-button"
                    onClick={() =>
                      setCheckoutOpen(
                        true
                      )
                    }
                  >
                    Continue to Checkout
                    →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          CHECKOUT MODAL
      ===================================================== */}

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
            <div className="modal-header">
              <div>
                <small>
                  CHECKOUT
                </small>

                <h2>
                  Confirm your order
                </h2>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setCheckoutOpen(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="checkout-box">
              <div>
                <span>
                  Products
                </span>

                <strong>
                  {cartCount}
                </strong>
              </div>

              <div>
                <span>
                  Total
                </span>

                <strong>
                  EGP {cartTotal}
                </strong>
              </div>
            </div>

            <div className="checkout-notice">
              <span>✓</span>

              <p>
                This is a demo pharmacy
                checkout. No real payment
                will be processed.
              </p>
            </div>

            <button
              className="confirm-order"
              onClick={
                confirmOrder
              }
            >
              Confirm Order ✓
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          SUCCESS
      ===================================================== */}

      {orderConfirmed && (
        <div className="success-toast">
          <div className="success-icon">
            ✓
          </div>

          <div>
            <strong>
              Order confirmed!
            </strong>

            <p>
              Thank you for choosing
              PharmaAI.
            </p>
          </div>

          <button
            onClick={() =>
              setOrderConfirmed(
                false
              )
            }
          >
            ×
          </button>
        </div>
      )}
    </main>
  );
}