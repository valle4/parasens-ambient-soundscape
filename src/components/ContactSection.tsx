import { useState } from "react";
import useScrollReveal from "@/hooks/useScrollReveal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [musicFormData, setMusicFormData] = useState({
    artistName: "",
    trackTitle: "",
    musicLink: "",
    email: "",
    description: "",
  });
  const [isMusicSubmitted, setIsMusicSubmitted] = useState(false);

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
      setIsDialogOpen(false);
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
          </div>
        )}

        <div
          ref={footerRef}
          className={`mt-24 pt-12 border-t border-border scroll-reveal scroll-reveal-delay-2 text-center space-y-4 ${footerRevealed ? "revealed" : ""}`}
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
          <p className="text-muted-foreground text-sm">
            Want to be featured?{" "}
            <button
              onClick={() => setIsDialogOpen(true)}
              className="text-foreground hover:opacity-70 transition-opacity duration-300"
            >
              Submit your music →
            </button>
          </p>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-semibold tracking-tight">
              Submit Your Music
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Share your track with us for a chance to be featured.
            </DialogDescription>
          </DialogHeader>

          {isMusicSubmitted ? (
            <div className="text-center py-8">
              <p className="text-lg font-light">Thank you for your submission.</p>
              <p className="text-muted-foreground mt-2 text-sm">We'll review your track soon.</p>
            </div>
          ) : (
            <form onSubmit={handleMusicSubmit} className="space-y-4 mt-4">
              <input
                type="text"
                name="artistName"
                value={musicFormData.artistName}
                onChange={handleMusicChange}
                placeholder="Artist Name"
                required
                className="input-minimal"
              />
              <input
                type="text"
                name="trackTitle"
                value={musicFormData.trackTitle}
                onChange={handleMusicChange}
                placeholder="Track Title"
                required
                className="input-minimal"
              />
              <input
                type="url"
                name="musicLink"
                value={musicFormData.musicLink}
                onChange={handleMusicChange}
                placeholder="Spotify / SoundCloud Link"
                required
                className="input-minimal"
              />
              <input
                type="email"
                name="email"
                value={musicFormData.email}
                onChange={handleMusicChange}
                placeholder="Your Email"
                required
                className="input-minimal"
              />
              <textarea
                name="description"
                value={musicFormData.description}
                onChange={handleMusicChange}
                placeholder="Brief description (optional)"
                rows={3}
                className="input-minimal resize-none"
              />
              <div className="pt-2">
                <button type="submit" className="button-minimal w-full">
                  Submit Track
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ContactSection;
