import { useState } from "react";
import useScrollReveal from "@/hooks/useScrollReveal";
import { ArrowLeft } from "lucide-react";

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
    musicLink: "",
    email: "",
    description: "",
  });
  const [isMusicSubmitted, setIsMusicSubmitted] = useState(false);

  const { ref: headerRef, isRevealed: headerRevealed } = useScrollReveal();
  const { ref: contentRef, isRevealed: contentRevealed } = useScrollReveal();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setFormData({ name: "", email: "", message: "" });
      setIsSubmitted(false);
      setActiveView("selection");
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

  const handleMusicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsMusicSubmitted(true);
    setTimeout(() => {
      setMusicFormData({
        artistName: "",
        trackTitle: "",
        musicLink: "",
        email: "",
        description: "",
      });
      setIsMusicSubmitted(false);
      setActiveView("selection");
    }, 3000);
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
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              {isSubmitted ? (
                <div className="text-center py-16">
                  <p className="text-xl font-light">Thank you for reaching out.</p>
                  <p className="text-muted-foreground mt-2">We'll respond soon.</p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-8 flex flex-col items-center"
                >
                  <div className="w-full max-w-md">
                    <input
                      type="text"
                      name="name"
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
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Message"
                      rows={4}
                      required
                      className="input-minimal resize-none text-center"
                    />
                  </div>
                  <div className="pt-4">
                    <button type="submit" className="button-minimal">
                      Send Message
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
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              {isMusicSubmitted ? (
                <div className="text-center py-16">
                  <p className="text-xl font-light">Thank you for your submission.</p>
                  <p className="text-muted-foreground mt-2">We'll review your track soon.</p>
                </div>
              ) : (
                <form
                  onSubmit={handleMusicSubmit}
                  className="space-y-8 flex flex-col items-center"
                >
                  <div className="w-full max-w-md">
                    <input
                      type="text"
                      name="artistName"
                      value={musicFormData.artistName}
                      onChange={handleMusicChange}
                      placeholder="Artist Name"
                      required
                      className="input-minimal text-center"
                    />
                  </div>
                  <div className="w-full max-w-md">
                    <input
                      type="text"
                      name="trackTitle"
                      value={musicFormData.trackTitle}
                      onChange={handleMusicChange}
                      placeholder="Track Title"
                      required
                      className="input-minimal text-center"
                    />
                  </div>
                  <div className="w-full max-w-md">
                    <input
                      type="url"
                      name="musicLink"
                      value={musicFormData.musicLink}
                      onChange={handleMusicChange}
                      placeholder="Spotify / SoundCloud Link"
                      required
                      className="input-minimal text-center"
                    />
                  </div>
                  <div className="w-full max-w-md">
                    <input
                      type="email"
                      name="email"
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
                      value={musicFormData.description}
                      onChange={handleMusicChange}
                      placeholder="Brief description (optional)"
                      rows={3}
                      className="input-minimal resize-none text-center"
                    />
                  </div>
                  <div className="pt-4">
                    <button type="submit" className="button-minimal">
                      Submit Track
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
