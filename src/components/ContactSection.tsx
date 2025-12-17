import { useState } from "react";
import useScrollReveal from "@/hooks/useScrollReveal";

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { ref: headerRef, isRevealed: headerRevealed } = useScrollReveal();
  const { ref: formRef, isRevealed: formRevealed } = useScrollReveal();
  const { ref: footerRef, isRevealed: footerRevealed } = useScrollReveal();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setFormData({ name: "", email: "", message: "" });
      setIsSubmitted(false);
    }, 3000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <section
      id="contact"
      className="min-h-screen section-padding flex items-center bg-card"
    >
      <div className="w-full max-w-2xl mx-auto">
        <div
          ref={headerRef}
          className={`scroll-reveal ${headerRevealed ? "revealed" : ""}`}
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
            Get in Touch
          </h2>
          <p className="text-muted-foreground text-lg mb-12 md:mb-16">
            Questions, collaborations, or just a quiet hello.
          </p>
        </div>

        {isSubmitted ? (
          <div className="text-center py-16">
            <p className="text-xl font-light">Thank you for reaching out.</p>
            <p className="text-muted-foreground mt-2">We'll respond soon.</p>
          </div>
        ) : (
          <div
            ref={formRef}
            className={`scroll-reveal scroll-reveal-delay-1 ${formRevealed ? "revealed" : ""}`}
          >
            <form
              onSubmit={handleSubmit}
              className="space-y-8"
            >
            <div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Name"
                required
                className="input-minimal"
              />
            </div>

            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                required
                className="input-minimal"
              />
            </div>

            <div>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Message"
                rows={4}
                required
                className="input-minimal resize-none"
              />
            </div>

            <div className="pt-4">
              <button type="submit" className="button-minimal">
                Send Message
              </button>
            </div>
            </form>
          </div>
        )}

        <div
          ref={footerRef}
          className={`mt-24 pt-12 border-t border-border scroll-reveal scroll-reveal-delay-2 ${footerRevealed ? "revealed" : ""}`}
        >
          <p className="text-muted-foreground text-sm">
            Or write directly:{" "}
            <a
              href="mailto:hello@parasens.com"
              className="text-foreground hover:opacity-70 transition-opacity duration-300"
            >
              hello@parasens.com
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
