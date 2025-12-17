import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import MusicPlayer from "@/components/MusicPlayer";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <MusicPlayer />
      <AboutSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
