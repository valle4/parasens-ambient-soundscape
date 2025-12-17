import { useState, useRef, useEffect } from "react";

const ContactSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate form submission
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
      ref={sectionRef}
      className="min-h-screen section-padding flex items-center bg-card"
    >
      <div className="w-full max-w-2xl mx-auto">
        <div
          className={`transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
            Get in Touch
          </h2>
          <p className="text-muted-foreground text-lg mb-12 md:mb-16">
            Questions, collaborations, or just a quiet hello.
          </p>
        </div>

        {isSubmitted ? (
          <div
            className={`text-center py-16 transition-all duration-500 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <p className="text-xl font-light">Thank you for reaching out.</p>
            <p className="text-muted-foreground mt-2">We'll respond soon.</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className={`space-y-8 transition-all duration-1000 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
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
        )}

        <div
          className={`mt-24 pt-12 border-t border-border transition-all duration-1000 delay-400 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
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
