import { useRef, useState } from "react";
import useScrollReveal from "@/hooks/useScrollReveal";
import { ArrowLeft } from "lucide-react";

import { submitContact } from "@/lib/contact";

type ActiveView = "selection" | "message" | "music";

const ContactSection = () => {
  const [activeView, setActiveView] = useState<ActiveView>("selection");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [musicFormData, setMusicFormData] = useState({
    artistName: "",
    trackTitle: "",
    genre: "",
    musicLink: "",
    email: "",
    description: "",
  });
  const [isMusicSubmitted, setIsMusicSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [website, setWebsite] = useState("");
  const inFlight = useRef(false);
  const attempt = useRef<{ payload: string; id: string } | null>(null);

  const send = async (data: Record<string, string>) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setPending(true);
    setError("");
    const payload = JSON.stringify(data);
    if (attempt.current?.payload !== payload) attempt.current = { payload, id: crypto.randomUUID() };
    try {
      await submitContact({ ...data, website, requestId: attempt.current.id });
      attempt.current = null;
      return true;
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Please try again, or email hello@parasens.com.");
      return false;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  const formStatus = <>
    <div className="absolute -left-[10000px]" aria-hidden="true">
      <label>Leave this field empty<input name="website" value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" /></label>
    </div>
    {error && <p role="alert" className="max-w-md text-sm text-muted-foreground text-center">{error}</p>}
  </>;

  const { ref: headerRef, isRevealed: headerRevealed } = useScrollReveal();
  const { ref: contentRef, isRevealed: contentRevealed } = useScrollReveal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await send({ kind: "message", ...formData })) {
      setIsSubmitted(true);
      setFormData({ name: "", email: "", message: "" });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleMusicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await send({ kind: "music", ...musicFormData })) {
      setIsMusicSubmitted(true);
      setMusicFormData({ artistName: "", trackTitle: "", genre: "", musicLink: "", email: "", description: "" });
    }
  };

  const handleMusicChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setMusicFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleBack = () => {
    if (pending) return;
    setError("");
    setIsSubmitted(false);
    setIsMusicSubmitted(false);
    setActiveView("selection");
  };

  return (
    <section
      id="contact"
      className="min-h-screen section-padding flex items-center bg-card"
    >
      <div className="w-full max-w-2xl mx-auto">
        <div
          ref={headerRef}
          className={`scroll-reveal text-center ${headerRevealed ? "revealed" : ""}`}
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
            Get in Touch
          </h2>
          <p className="text-muted-foreground text-lg mb-12 md:mb-16">
            Questions, collaborations, or just a quiet hello.
          </p>
        </div>

        <div
          ref={contentRef}
          className={`scroll-reveal scroll-reveal-delay-1 ${contentRevealed ? "revealed" : ""}`}
        >
          {activeView === "selection" && (
            <div className="space-y-12">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setActiveView("message")}
                  className="button-minimal px-8 py-4"
                >
                  Send a Message
                </button>
                <button
                  onClick={() => setActiveView("music")}
                  className="button-minimal px-8 py-4"
                >
                  Submit Music
                </button>
              </div>
              <p className="text-muted-foreground text-sm text-center">
                Or write directly:{" "}
                <a
                  href="mailto:hello@parasens.com"
                  className="text-foreground hover:opacity-70 transition-opacity duration-300"
                >
                  hello@parasens.com
                </a>
              </p>
            </div>
          )}

          {activeView === "message" && (
            <div className="space-y-8">
              <button
                onClick={handleBack}
                disabled={pending}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              {isSubmitted ? (
                <div role="status" className="text-center py-16">
                  <p className="text-xl font-light">Thank you for reaching out.</p>
                  <p className="text-muted-foreground mt-2">Your message has been sent. We'll respond soon.</p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="relative space-y-8 flex flex-col items-center"
                  aria-busy={pending}
                >
                  <div className="w-full max-w-md">
                    <input
                      type="text"
                      name="name"
                      aria-label="Name"
                      maxLength={120}
                      disabled={pending}
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Name"
                      required
                      className="input-minimal text-center"
                    />
                  </div>
                  <div className="w-full max-w-md">
                    <input
                      type="email"
                      name="email"
                      aria-label="Email"
                      maxLength={254}
                      disabled={pending}
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Email"
                      required
                      className="input-minimal text-center"
                    />
                  </div>
                  <div className="w-full max-w-md">
                    <textarea
                      name="message"
                      aria-label="Message"
                      maxLength={5000}
                      disabled={pending}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Message"
                      rows={4}
                      required
                      className="input-minimal resize-none text-center"
                    />
                  </div>
                  {formStatus}
                  <div className="pt-4">
                    <button type="submit" disabled={pending} className="button-minimal disabled:opacity-50">
                      {pending ? "Sending…" : "Send Message"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeView === "music" && (
            <div className="space-y-8">
              <button
                onClick={handleBack}
                disabled={pending}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              {isMusicSubmitted ? (
                <div role="status" className="text-center py-16">
                  <p className="text-xl font-light">Thank you for your submission.</p>
                  <p className="text-muted-foreground mt-2">Your submission has been sent. We'll review your track soon.</p>
                </div>
              ) : (
                <form
                  onSubmit={handleMusicSubmit}
                  className="relative space-y-8 flex flex-col items-center"
                  aria-busy={pending}
                >
                  <div className="w-full max-w-md">
                    <input
                      type="text"
                      name="artistName"
                      aria-label="Artist name"
                      maxLength={120}
                      disabled={pending}
                      value={musicFormData.artistName}
                      onChange={handleMusicChange}
                      placeholder="Artist Name (optional)"
                      className="input-minimal text-center"
                    />
                  </div>
                  <div className="w-full max-w-md">
                    <input
                      type="text"
                      name="trackTitle"
                      aria-label="Track title"
                      maxLength={160}
                      disabled={pending}
                      value={musicFormData.trackTitle}
                      onChange={handleMusicChange}
                      placeholder="Track Title (optional)"
                      className="input-minimal text-center"
                    />
                  </div>
                  <div className="w-full max-w-md">
                    <input
                      type="text"
                      name="genre"
                      aria-label="Genre"
                      maxLength={120}
                      disabled={pending}
                      value={musicFormData.genre}
                      onChange={handleMusicChange}
                      placeholder="Genre"
                      required
                      className="input-minimal text-center"
                    />
                  </div>
                  <div className="w-full max-w-md">
                    <input
                      type="url"
                      name="musicLink"
                      aria-label="Music link"
                      maxLength={2000}
                      disabled={pending}
                      value={musicFormData.musicLink}
                      onChange={handleMusicChange}
                      placeholder="Link (download or listening)"
                      required
                      className="input-minimal text-center"
                    />
                  </div>
                  <div className="w-full max-w-md">
                    <input
                      type="email"
                      name="email"
                      aria-label="Email"
                      maxLength={254}
                      disabled={pending}
                      value={musicFormData.email}
                      onChange={handleMusicChange}
                      placeholder="Your Email"
                      required
                      className="input-minimal text-center"
                    />
                  </div>
                  <div className="w-full max-w-md">
                    <textarea
                      name="description"
                      aria-label="Description"
                      maxLength={5000}
                      disabled={pending}
                      value={musicFormData.description}
                      onChange={handleMusicChange}
                      placeholder="Brief description"
                      rows={3}
                      className="input-minimal resize-none text-center"
                    />
                  </div>
                  {formStatus}
                  <div className="pt-4">
                    <button type="submit" disabled={pending} className="button-minimal disabled:opacity-50">
                      {pending ? "Sending…" : "Submit Track"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
